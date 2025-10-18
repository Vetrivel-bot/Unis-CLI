import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import CryptoJS from 'crypto-js';
import Aes from 'react-native-aes-crypto';
import {
  bytesToBase64,
  base64ToBytes,
  bytesToHex,
  hexToBytes,
  utf8ToBase64,
  base64ToUtf8,
  generateRandomBytes
} from './encoding';

// -------------------- CryptoJS Utilities --------------------
export const stringToBase64 = (str) => {
  return CryptoJS.enc.Utf8.parse(str).toString(CryptoJS.enc.Base64);
};

export const base64ToString = (base64) => {
  return CryptoJS.enc.Base64.parse(base64).toString(CryptoJS.enc.Utf8);
};
// -------------------- Key Generation --------------------
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: bytesToBase64(keyPair.publicKey),
    privateKey: bytesToBase64(keyPair.secretKey),
  };
};

export const generateSigningKeyPair = () => {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: bytesToBase64(keyPair.publicKey),
    privateKey: bytesToBase64(keyPair.secretKey),
  };
};

// -------------------- Key Exchange (X25519) --------------------
// Rest of your existing code remains the same...
export const computeSharedSecret = (myPrivateKey, theirPublicKey) => {
  try {
    const sharedSecret = nacl.scalarMult(
      base64ToBytes(myPrivateKey),
      base64ToBytes(theirPublicKey)
    );
    
    if (!sharedSecret || sharedSecret.length === 0) {
      throw new Error('Invalid key exchange');
    }
    
    return bytesToBase64(sharedSecret);
  } catch (error) {
    throw new Error(`Key exchange failed: ${error.message}`);
  }
};

// -------------------- HKDF (Key Derivation) --------------------

/**
 * HKDF implementation using CryptoJS (compatible with React Native)
 * @param {string} ikmBase64 - Input Key Material (base64)
 * @param {string} saltBase64 - Salt (base64, optional)
 * @param {string} info - Application context info
 * @param {number} length - Output length in bytes
 * @returns {string} Derived key as base64
 */
export const hkdf = (ikmBase64, saltBase64 = '', info = '', length = 32) => {
  try {
    // Parse inputs to CryptoJS WordArrays
    const ikm = CryptoJS.enc.Base64.parse(ikmBase64);
    const salt = saltBase64 
      ? CryptoJS.enc.Base64.parse(saltBase64) 
      : CryptoJS.lib.WordArray.create([0, 0, 0, 0]); // Zero-filled
    
    const infoWA = CryptoJS.enc.Utf8.parse(info);

    // HKDF Extract: PRK = HMAC-Hash(salt, IKM)
    const prk = CryptoJS.HmacSHA256(ikm, salt);

    // HKDF Expand
    let t = CryptoJS.lib.WordArray.create();
    let okm = CryptoJS.lib.WordArray.create();
    
    for (let i = 1; okm.words.length * 4 < length; i++) {
      // T(i) = HMAC-Hash(PRK, T(i-1) | info | i)
      const input = t.clone().concat(infoWA).concat(
        CryptoJS.lib.WordArray.create([i]) // Single byte counter
      );
      
      t = CryptoJS.HmacSHA256(input, prk);
      okm = okm.concat(t);
    }

    // Truncate to desired length and convert to base64
    okm.sigBytes = length;
    return CryptoJS.enc.Base64.stringify(okm);

  } catch (error) {
    console.error('[HKDF] Error:', error);
    throw new Error(`HKDF failed: ${error.message}`);
  }
};

/**
 * Simple key derivation for testing (fallback)
 */
export const simpleKdf = (inputBase64, outputLength = 32) => {
  try {
    const inputWA = CryptoJS.enc.Base64.parse(inputBase64);
    const hash = CryptoJS.SHA256(inputWA);
    hash.sigBytes = outputLength;
    return CryptoJS.enc.Base64.stringify(hash);
  } catch (error) {
    throw new Error(`Simple KDF failed: ${error.message}`);
  }
};

// -------------------- Key Derivation --------------------
export const deriveChatKeys = (sharedSecretBase64, saltBase64 = '') => {
  try {
    const rootKey = hkdf(sharedSecretBase64, saltBase64, 'root-key', 32);
    const messageKey = hkdf(rootKey, saltBase64, 'message-key', 32);
    const authKey = hkdf(rootKey, saltBase64, 'auth-key', 32);
    
    return { rootKey, messageKey, authKey };
  } catch (error) {
    console.warn('HKDF failed, using simple KDF fallback:', error.message);
    // Fallback to simple KDF
    const rootKey = simpleKdf(sharedSecretBase64 + saltBase64, 32);
    const messageKey = simpleKdf(rootKey + 'message', 32);
    const authKey = simpleKdf(rootKey + 'auth', 32);
    
    return { rootKey, messageKey, authKey };
  }
};


// -------------------- AES-256-GCM Encryption --------------------
export const encryptMessage = async (message, keyBase64) => {
  try {
    const iv = await Aes.randomKey(12);
    const ciphertext = await Aes.encrypt(
      message,
      bytesToHex(base64ToBytes(keyBase64)),
      iv,
      'aes-256-gcm'
    );
    
    return {
      ciphertext,
      iv,
      algorithm: 'aes-256-gcm'
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

export const decryptMessage = async (ciphertext, keyBase64, iv) => {
  try {
    const plaintext = await Aes.decrypt(
      ciphertext,
      bytesToHex(base64ToBytes(keyBase64)),
      iv,
      'aes-256-gcm'
    );
    
    return plaintext;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

// -------------------- Digital Signatures (Ed25519) --------------------
export const signMessage = (message, privateKeyBase64) => {
  try {
    const signature = nacl.sign.detached(
      base64ToBytes(utf8ToBase64(message)),
      base64ToBytes(privateKeyBase64)
    );
    return bytesToBase64(signature);
  } catch (error) {
    throw new Error(`Signing failed: ${error.message}`);
  }
};

export const verifySignature = (message, signatureBase64, publicKeyBase64) => {
  try {
    return nacl.sign.detached.verify(
      base64ToBytes(utf8ToBase64(message)),
      base64ToBytes(signatureBase64),
      base64ToBytes(publicKeyBase64)
    );
  } catch (error) {
    throw new Error(`Signature verification failed: ${error.message}`);
  }
};