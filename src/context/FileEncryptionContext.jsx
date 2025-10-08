// src/context/FileEncryptionContext.js
import React, { createContext, useContext, useEffect } from 'react';
import RNFS from 'react-native-fs';
import { useKeystore } from './KeystoreContext';
import { Buffer } from 'buffer';
import crypto from 'react-native-quick-crypto';

const FileEncryptionContext = createContext(null);

const STORAGE_DIR = `${RNFS.DocumentDirectoryPath}/secure_files`;
const META_SUFFIX = '.meta.json';
const MASTER_KEY_NAME = 'master_encryption_key';

// --- Helpers ---------------------------------------------------------------

async function ensureDirectoryExists() {
  try {
    const exists = await RNFS.exists(STORAGE_DIR);
    if (!exists) await RNFS.mkdir(STORAGE_DIR);
  } catch (e) {
    console.error('[FileEncryption] ensureDirectoryExists failed', e);
    throw e;
  }
}

function hkdfSha256(ikm, salt = Buffer.alloc(32, 0), info = Buffer.alloc(0), length = 32) {
  const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
  let prev = Buffer.alloc(0);
  const buffers = [];
  const n = Math.ceil(length / 32);
  for (let i = 0; i < n; i++) {
    const hmac = crypto.createHmac('sha256', prk);
    hmac.update(prev);
    if (info && info.length) hmac.update(info);
    hmac.update(Buffer.from([i + 1]));
    prev = hmac.digest();
    buffers.push(prev);
  }
  const okm = Buffer.concat(buffers, n * 32);
  return okm.slice(0, length);
}

function hexToBuffer(hex) {
  return Buffer.from(hex, 'hex');
}

function bufferToHex(b) {
  return b.toString('hex');
}

function randomBytes(len) {
  return crypto.randomBytes(len);
}

// --- Master key handling ----------------------------------------------------

async function generateAndStoreMasterKeyIfMissing(keystore) {
  const existing = await keystore.get(MASTER_KEY_NAME);
  if (existing) return existing;
  const rand = randomBytes(32).toString('hex');
  await keystore.save(MASTER_KEY_NAME, rand);
  return rand;
}

// --- Public API -------------------------------------------------------------

export const FileEncryptionProvider = ({ children }) => {
  const keystore = useKeystore();

  useEffect(() => {
    ensureDirectoryExists().catch(e => console.error('[FileEncryption] ensure dir error', e));
    (async () => {
      try {
        await generateAndStoreMasterKeyIfMissing(keystore);
      } catch (e) {
        console.error('[FileEncryption] master key init error', e);
      }
    })();
  }, [keystore]);

  const encryptFile = async (inputPath, outputFileName) => {
    await ensureDirectoryExists();

    // Validate input path
    if (!inputPath || !(await RNFS.exists(inputPath))) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }

    const masterHex = await generateAndStoreMasterKeyIfMissing(keystore);
    if (!masterHex || typeof masterHex !== 'string') {
      throw new Error('Master key unavailable from keystore');
    }
    const masterBuf = hexToBuffer(masterHex);

    const purpose = outputFileName || String(Date.now());
    const salt = randomBytes(32);
    const info = Buffer.from(purpose, 'utf8');

    const keyBuf = hkdfSha256(masterBuf, salt, info, 32);
    const iv = randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
    try {
      cipher.setAAD(info);
    } catch (e) {
      console.warn('[FileEncryption] cipher.setAAD not available:', e?.message ?? e);
    }

    // NEW APPROACH: Read entire file and encrypt in one go (for testing)
    console.log('[FileEncryption] Reading entire file for encryption...');
    const fileBase64 = await RNFS.readFile(inputPath, 'base64');
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    
    const encryptedBuffer = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag ? cipher.getAuthTag() : Buffer.alloc(0);

    const finalPath = `${STORAGE_DIR}/${outputFileName}`;
    
    // Write encrypted file
    await RNFS.writeFile(finalPath, encryptedBuffer.toString('base64'), 'base64');

    // Write metadata
    const meta = {
      version: 1,
      algorithm: 'AES-256-GCM',
      saltHex: salt.toString('hex'),
      ivHex: iv.toString('hex'),
      authTagHex: authTag.toString('hex'),
      purpose,
      createdAt: new Date().toISOString(),
    };

    await RNFS.writeFile(finalPath + META_SUFFIX, JSON.stringify(meta), 'utf8');

    return { encryptedPath: finalPath, metaPath: finalPath + META_SUFFIX };
  };

  const decryptToCache = async (encryptedPath, outputFileName) => {
    // Validate encrypted file exists
    if (!encryptedPath || !(await RNFS.exists(encryptedPath))) {
      throw new Error(`Encrypted file does not exist: ${encryptedPath}`);
    }

    const masterHex = await generateAndStoreMasterKeyIfMissing(keystore);
    if (!masterHex) throw new Error('Master key unavailable');

    const metaPath = encryptedPath + META_SUFFIX;
    if (!(await RNFS.exists(metaPath))) {
      throw new Error('Missing metadata for encrypted file.');
    }

    const metaRaw = await RNFS.readFile(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw);

    if (!meta.saltHex || !meta.ivHex) {
      throw new Error('Missing salt or IV in metadata.');
    }

    const salt = hexToBuffer(meta.saltHex);
    const iv = hexToBuffer(meta.ivHex);
    const purpose = meta.purpose || '';
    const info = Buffer.from(purpose, 'utf8');

    const masterBuf = hexToBuffer(masterHex);
    const keyBuf = hkdfSha256(masterBuf, salt, info, 32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
    try {
      decipher.setAAD(info);
    } catch (e) {
      // ignore if not supported
    }

    if (meta.authTagHex) {
      const authTag = hexToBuffer(meta.authTagHex);
      try {
        decipher.setAuthTag(authTag);
      } catch (e) {
        console.warn('[FileEncryption] decipher.setAuthTag failed', e?.message ?? e);
      }
    }

    const outName = outputFileName || `decrypted_${Date.now()}`;
    const outputPath = `${RNFS.CachesDirectoryPath}/${outName}`;

    // NEW APPROACH: Read entire encrypted file and decrypt in one go
    console.log('[FileEncryption] Reading entire file for decryption...');
    const encryptedBase64 = await RNFS.readFile(encryptedPath, 'base64');
    const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
    
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);

    await RNFS.writeFile(outputPath, decryptedBuffer.toString('base64'), 'base64');

    return outputPath;
  };

  const deleteEncryptedFile = async encryptedPath => {
    const metaPath = encryptedPath + META_SUFFIX;
    if (await RNFS.exists(encryptedPath)) await RNFS.unlink(encryptedPath);
    if (await RNFS.exists(metaPath)) await RNFS.unlink(metaPath);
  };

  const listEncryptedFiles = async () => {
    await ensureDirectoryExists();
    const files = await RNFS.readDir(STORAGE_DIR);
    return files.filter(f => !f.name.endsWith(META_SUFFIX)).map(f => f.path);
  };

  const value = { 
    encryptFile, 
    decryptToCache, 
    deleteEncryptedFile, 
    listEncryptedFiles 
  };

  return <FileEncryptionContext.Provider value={value}>{children}</FileEncryptionContext.Provider>;
};

export const useFileEncryption = () => {
  const ctx = useContext(FileEncryptionContext);
  if (!ctx) throw new Error('useFileEncryption must be used within FileEncryptionProvider');
  return ctx;
};