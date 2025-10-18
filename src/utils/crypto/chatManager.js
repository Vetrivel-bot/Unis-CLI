import {
  generateKeyPair,
  generateSigningKeyPair,
  computeSharedSecret,
  hkdf,
  deriveChatKeys,
  encryptMessage,
  decryptMessage,
  signMessage,
  verifySignature,
} from './coreCrypto';
import { bytesToBase64, generateRandomBytes } from './encoding';

// -------------------- Enhanced Chat Crypto Manager --------------------
export class SecureChatManager {
  constructor(secureKeysHook) {
    this.sessions = new Map();
    this.identityKeys = null;
    this.secureKeys = secureKeysHook;
  }

  // Initialize with secure storage
  async initialize() {
    try {
      // Try to load existing identity keys
      this.identityKeys = await this.secureKeys.loadIdentityKeys();

      if (!this.identityKeys) {
        // Generate new identity keys
        this.identityKeys = generateSigningKeyPair();

        // Save them securely
        const saved = await this.secureKeys.saveIdentityKeys(this.identityKeys);
        if (!saved) {
          throw new Error('Failed to save identity keys securely');
        }

        console.log('[SecureChatManager] New identity keys generated and saved');
      } else {
        console.log('[SecureChatManager] Existing identity keys loaded');
      }

      return this.identityKeys;
    } catch (error) {
      console.error('[SecureChatManager] Initialization failed:', error);
      throw error;
    }
  }

  // Start a new secure session
  // In chatManager.js - FIXED startSession method
  async initSession() {
    const ephemeralKeys = generateKeyPair();
    console.log(
      `[initSession] Ephemeral Public Key: ${ephemeralKeys.publicKey.substring(0, 20)}...`,
    );
    return ephemeralKeys;
  }
  async startSession(
    peerPublicKey,
    peerSigningPublicKey,
    sessionId,
    providedSalt = null,
    ephemeralKeys = null,
  ) {

    try {
      let sharedSecret;
      if (!ephemeralKeys) {
        ephemeralKeys = generateKeyPair();
        sharedSecret = computeSharedSecret(ephemeralKeys.privateKey, peerPublicKey);
      } else {
        sharedSecret = computeSharedSecret(ephemeralKeys.privateKey, peerPublicKey);
      }

      // Use provided salt or generate new one
      const salt = providedSalt || bytesToBase64(generateRandomBytes(32));

      console.log(`[Session ${sessionId}] Shared secret: ${sharedSecret.substring(0, 20)}...`);
      console.log(`[Session ${sessionId}] Salt: ${salt.substring(0, 20)}...`);

      // Derive keys
      const rootKey = hkdf(sharedSecret, salt, 'root-key', 32);
      const messageKey = hkdf(rootKey, salt, 'message-key', 32);
      const authKey = hkdf(rootKey, salt, 'auth-key', 32);

      const sessionData = {
        ephemeralKeys,
        peerPublicKey,
        peerSigningPublicKey,
        sharedSecret,
        salt,
        rootKey,
        messageKey,
        authKey,
        messageCount: 0,
        createdAt: Date.now(),
      };

      this.sessions.set(sessionId, sessionData);
      await this.secureKeys.saveSession(sessionId, sessionData);

      console.log(`[SecureChatManager] Session ${sessionId} started`);
      console.log(`[Session ${sessionId}] Message key: ${messageKey.substring(0, 20)}...`);

      return {
        ephemeralPublicKey: ephemeralKeys.publicKey,
        salt, // Return salt so peer can use the same one
        identityPublicKey: this.identityKeys.publicKey,
      };
    } catch (error) {
      console.error(`[SecureChatManager] Session start failed for ${sessionId}:`, error);
      throw error;
    }
  }

  // Load session from secure storage
  async loadSession(sessionId) {
    try {
      const sessionData = await this.secureKeys.loadSession(sessionId);
      if (sessionData) {
        this.sessions.set(sessionId, sessionData);
        console.log(`[SecureChatManager] Session ${sessionId} loaded from storage`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`[SecureChatManager] Failed to load session ${sessionId}:`, error);
      return false;
    }
  }

  // Encrypt message with session management
  // In your encryptMessage method - FIX THIS PART:
  async encryptMessage(sessionId, plaintext) {
    let session = this.sessions.get(sessionId);

    if (!session) {
     const loaded = await this.loadSession(sessionId);
      if (!loaded) throw new Error(`Session ${sessionId} not found`);
      session = this.sessions.get(sessionId);
    }

    try {
      // Use the simpler deriveMessageKey function
      const messageSpecificKey = hkdf(
        session.messageKey,
        session.salt,
        `msg-${session.messageCount}`,
        32,
      );

      console.log(`[Encrypt] Message ${session.messageCount}`);
      console.log(`[Encrypt] Key: ${messageSpecificKey.substring(0, 20)}...`);
      console.log(`[Encrypt] Plaintext: "${plaintext}"`);

      const encrypted = await encryptMessage(plaintext, messageSpecificKey);

      console.log(`[Encrypt] Ciphertext length: ${encrypted.ciphertext.length}`);
      console.log(`[Encrypt] IV: ${encrypted.iv}`);

      const payloadToSign = encrypted.ciphertext + encrypted.iv + sessionId + session.messageCount;
      const signature = signMessage(payloadToSign, this.identityKeys.privateKey);

      const result = {
        sessionId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        algorithm: encrypted.algorithm,
        signature,
        messageNumber: session.messageCount,
        timestamp: Date.now(),
      };

      // Update session AFTER successful encryption
      session.messageCount++;
      await this.secureKeys.saveSession(sessionId, session);

      return result;
    } catch (error) {
      console.error('[Encrypt] Error:', error);
      throw new Error(`Message encryption failed: ${error.message}`);
    }
  }

  async decryptMessage(encryptedMessage) {
    const { sessionId, ciphertext, iv, signature, messageNumber } = encryptedMessage;

    let session = this.sessions.get(sessionId);
    if (!session) {
      const loaded = await this.loadSession(sessionId);
      if (!loaded) throw new Error(`Session ${sessionId} not found for decryption`);
      session = this.sessions.get(sessionId);
    }

    try {
      console.log(`[Decrypt] Message ${messageNumber}`);
      console.log(`[Decrypt] Ciphertext length: ${ciphertext.length}`);
      console.log(`[Decrypt] IV: ${iv}`);

      // Verify signature
      const payloadToVerify = ciphertext + iv + sessionId + messageNumber;
      const isValidSignature = verifySignature(
        payloadToVerify,
        signature,
        session.peerSigningPublicKey,
      );

      if (!isValidSignature) {
        throw new Error('Invalid message signature');
      }

      // Use the same key derivation as encryption
      const messageSpecificKey = hkdf(session.messageKey, session.salt, `msg-${messageNumber}`, 32);

      console.log(`[Decrypt] Key: ${messageSpecificKey.substring(0, 20)}...`);

      // Decrypt
      const plaintext = await decryptMessage(ciphertext, messageSpecificKey, iv);

      console.log(`[Decrypt] Success: "${plaintext}"`);

      return plaintext;
    } catch (error) {
      console.error('[Decrypt] Error:', error);
      throw new Error(`Message decryption failed: ${error.message}`);
    }
  }

  // Get session info
  getSessionInfo(sessionId) {
    const session = this.sessions.get(sessionId);
    return session
      ? {
          sessionId,
          messageCount: session.messageCount,
          peerPublicKey: session.peerPublicKey?.substring(0, 16) + '...',
          createdAt: session.createdAt,
        }
      : null;
  }

  // Get all active sessions
  getActiveSessions() {
    const sessions = [];
    for (const [sessionId, session] of this.sessions) {
      sessions.push({
        sessionId,
        messageCount: session.messageCount,
        peerPublicKey: session.peerPublicKey?.substring(0, 16) + '...',
        createdAt: session.createdAt,
      });
    }
    return sessions;
  }

  // Cleanup
  async cleanup() {
    for (const [sessionId] of this.sessions) {
      await this.secureKeys.removeSession(sessionId);
    }
    this.sessions.clear();
  }
}
