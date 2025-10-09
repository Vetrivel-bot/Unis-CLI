// chat-crypto.js
import nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";

// Helper encoders
export const encodeBase64 = (arr) => naclUtil.encodeBase64(arr);
export const decodeBase64 = (b64) => naclUtil.decodeBase64(b64);
export const encodeUTF8 = (arr) => naclUtil.encodeUTF8(arr);
export const decodeUTF8 = (s) => naclUtil.decodeUTF8(s);

// 1) Generate an encryption keypair (Curve25519)
export function generateKeyPair() {
  const keyPair = nacl.box.keyPair();
  // publicKey and secretKey are Uint8Array(32)
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

// 2) Optionally generate a signing keypair (Ed25519) for auth/signatures
// TweetNaCl has sign.keyPair(). If you want to sign messages to prove sender identity,
// create sign keys separately.
export function generateSigningKeyPair() {
  const kp = nacl.sign.keyPair();
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  };
}

// 3) Encrypt a message using sender secretKey and recipient publicKey
// Returns a compact base64 string that contains nonce + ciphertext.
export function encryptMessage({ senderSecretKeyB64, recipientPublicKeyB64, message }) {
  const senderSk = decodeBase64(senderSecretKeyB64); // Uint8Array(32)
  const recipientPk = decodeBase64(recipientPublicKeyB64); // Uint8Array(32)

  // nonce must be unique per message — use random 24 bytes
  const nonce = nacl.randomBytes(nacl.box.nonceLength); // 24 bytes
  const messageUint8 = naclUtil.decodeUTF8(message);

  // nacl.box outputs ciphertext (Uint8Array)
  const cipher = nacl.box(messageUint8, nonce, recipientPk, senderSk);

  // return nonce + cipher as base64 so it can travel in JSON
  const combined = new Uint8Array(nonce.length + cipher.length);
  combined.set(nonce);
  combined.set(cipher, nonce.length);

  return encodeBase64(combined);
}

// 4) Decrypt a base64 (nonce+cipher) using recipient secretKey & sender publicKey
export function decryptMessage({ recipientSecretKeyB64, senderPublicKeyB64, payloadB64 }) {
  const recipientSk = decodeBase64(recipientSecretKeyB64);
  const senderPk = decodeBase64(senderPublicKeyB64);

  const combined = decodeBase64(payloadB64);
  const nonce = combined.slice(0, nacl.box.nonceLength);
  const cipher = combined.slice(nacl.box.nonceLength);

  const plainUint8 = nacl.box.open(cipher, nonce, senderPk, recipientSk);
  if (!plainUint8) return null; // failed to decrypt / authenticity check failed

  return naclUtil.encodeUTF8(plainUint8);
}
