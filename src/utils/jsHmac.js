// src/utils/jsHmac.js
import RNFS from 'react-native-fs';
import CryptoJS from 'crypto-js';

/**
 * Compute HMAC-SHA256 over a file by reading it in chunks.
 * Returns Base64 (no line breaks).
 *
 * @param {string} filePath
 * @param {string} keyHex - key as hex string
 * @param {number} [chunkSize=64*1024] - bytes per chunk
 * @returns {Promise<string>} base64 HMAC
 */
export async function computeHmacForFileJS(filePath, keyHex, chunkSize = 64 * 1024) {
  if (!filePath) throw new Error('computeHmacForFileJS: filePath is required');
  if (!keyHex) throw new Error('computeHmacForFileJS: keyHex is required');

  // Create HMAC instance with CryptoJS (key as WordArray)
  const keyWA = CryptoJS.enc.Hex.parse(keyHex);
  const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, keyWA);

  // Stat file to get size
  const stat = await RNFS.stat(filePath);
  const totalSize = Number(stat.size);
  let offset = 0;

  while (offset < totalSize) {
    const readLen = Math.min(chunkSize, totalSize - offset);
    // RNFS.read returns base64 when encoding 'base64'
    const chunkBase64 = await RNFS.read(filePath, readLen, offset, 'base64');
    // Convert base64 chunk to CryptoJS WordArray
    const chunkWA = CryptoJS.enc.Base64.parse(chunkBase64);
    // Update HMAC with the chunk WordArray
    hmac.update(chunkWA);
    offset += readLen;
  }

  const macWA = hmac.finalize();
  const macBase64 = macWA.toString(CryptoJS.enc.Base64);
  return macBase64;
}
