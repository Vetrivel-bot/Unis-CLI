// crypto/encoding.js
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// -------------------- Encoding Utilities --------------------
export const utf8ToBase64 = (text) => {
  return naclUtil.encodeBase64(naclUtil.decodeUTF8(text));
};

export const base64ToUtf8 = (base64) => {
  return naclUtil.encodeUTF8(naclUtil.decodeBase64(base64));
};

export const bytesToBase64 = (bytes) => {
  return naclUtil.encodeBase64(bytes);
};

export const base64ToBytes = (base64) => {
  return naclUtil.decodeBase64(base64);
};

export const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

export const bytesToHex = (bytes) => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateRandomBytes = (length) => {
  return nacl.randomBytes(length);
};