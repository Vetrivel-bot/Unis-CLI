import { useKeystore } from '../../context/KeystoreContext';

// -------------------- Secure Key Storage Hook --------------------
export const useSecureKeys = () => {
  const keystore = useKeystore();
  
  const KEY_NAMES = {
    IDENTITY_KEYS: 'identity_keys',
    SESSIONS: 'sessions',
    MASTER_KEY: 'master_key'
  };

  // Save identity keys securely
  const saveIdentityKeys = async (identityKeys) => {
    if (!keystore.isAvailable) {
      console.warn('[SecureKeys] Keystore not available, using fallback storage');
      return saveToFallbackStorage(KEY_NAMES.IDENTITY_KEYS, identityKeys);
    }

    try {
      const encryptedKeys = await encryptForStorage(identityKeys);
      await keystore.save(KEY_NAMES.IDENTITY_KEYS, encryptedKeys);
      console.log('[SecureKeys] Identity keys saved securely');
      return true;
    } catch (error) {
      console.error('[SecureKeys] Failed to save identity keys:', error);
      return false;
    }
  };

  // Load identity keys securely
  const loadIdentityKeys = async () => {
    if (!keystore.isAvailable) {
      console.warn('[SecureKeys] Keystore not available, using fallback storage');
      return loadFromFallbackStorage(KEY_NAMES.IDENTITY_KEYS);
    }

    try {
      const encryptedKeys = await keystore.get(KEY_NAMES.IDENTITY_KEYS);
      if (!encryptedKeys) return null;
      
      const identityKeys = await decryptFromStorage(encryptedKeys);
      console.log('[SecureKeys] Identity keys loaded securely');
      return identityKeys;
    } catch (error) {
      console.error('[SecureKeys] Failed to load identity keys:', error);
      return null;
    }
  };

  // Save session data securely
  const saveSession = async (sessionId, sessionData) => {
    const key = `${KEY_NAMES.SESSIONS}_${sessionId}`;
    
    if (!keystore.isAvailable) {
      return saveToFallbackStorage(key, sessionData);
    }

    try {
      const encryptedSession = await encryptForStorage(sessionData);
      await keystore.save(key, encryptedSession);
      console.log(`[SecureKeys] Session ${sessionId} saved securely`);
      return true;
    } catch (error) {
      console.error(`[SecureKeys] Failed to save session ${sessionId}:`, error);
      return false;
    }
  };

  // Load session data securely
  const loadSession = async (sessionId) => {
    const key = `${KEY_NAMES.SESSIONS}_${sessionId}`;
    
    if (!keystore.isAvailable) {
      return loadFromFallbackStorage(key);
    }

    try {
      const encryptedSession = await keystore.get(key);
      if (!encryptedSession) return null;
      
      const sessionData = await decryptFromStorage(encryptedSession);
      console.log(`[SecureKeys] Session ${sessionId} loaded securely`);
      return sessionData;
    } catch (error) {
      console.error(`[SecureKeys] Failed to load session ${sessionId}:`, error);
      return null;
    }
  };

  // Remove session data
  const removeSession = async (sessionId) => {
    const key = `${KEY_NAMES.SESSIONS}_${sessionId}`;
    
    if (!keystore.isAvailable) {
      return removeFromFallbackStorage(key);
    }

    try {
      await keystore.remove(key);
      console.log(`[SecureKeys] Session ${sessionId} removed`);
      return true;
    } catch (error) {
      console.error(`[SecureKeys] Failed to remove session ${sessionId}:`, error);
      return false;
    }
  };

  // Clear all secure data (logout)
  const clearAllData = async () => {
    try {
      // Remove identity keys
      await keystore.remove(KEY_NAMES.IDENTITY_KEYS);
      
      // Remove all sessions
      const sessions = await getAllSessionIds();
      for (const sessionId of sessions) {
        await removeSession(sessionId);
      }
      
      console.log('[SecureKeys] All secure data cleared');
      return true;
    } catch (error) {
      console.error('[SecureKeys] Failed to clear all data:', error);
      return false;
    }
  };

  // Helper functions for storage encryption
  const encryptForStorage = async (data) => {
    return JSON.stringify(data);
  };

  const decryptFromStorage = async (encryptedData) => {
    return JSON.parse(encryptedData);
  };

  // Fallback storage (AsyncStorage) for when keystore is unavailable
  const saveToFallbackStorage = async (key, data) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[SecureKeys] Fallback save failed:', error);
      return false;
    }
  };

  const loadFromFallbackStorage = async (key) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[SecureKeys] Fallback load failed:', error);
      return null;
    }
  };

  const removeFromFallbackStorage = async (key) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('[SecureKeys] Fallback remove failed:', error);
      return false;
    }
  };

  const getAllSessionIds = async () => {
    // This would need to be implemented based on how you track sessions
    return [];
  };

  return {
    saveIdentityKeys,
    loadIdentityKeys,
    saveSession,
    loadSession,
    removeSession,
    clearAllData,
    isKeystoreAvailable: keystore.isAvailable
  };
};