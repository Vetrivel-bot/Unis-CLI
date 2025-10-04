import React, { createContext, useContext, useMemo } from 'react';
import { NativeModules } from 'react-native';

const { SecureStorage } = NativeModules || {};

const KeystoreContext = createContext({
  isAvailable: false,
  save: async () => null,
  get: async () => null,
  remove: async () => null,
  rotateMasterKey: async () => null,
  migrateToStrongBoxIfAvailable: async () => null,
});

export const KeystoreProvider = ({ children }) => {
  const isAvailable = !!(SecureStorage && typeof SecureStorage.save === 'function');

  console.log('[KeystoreProvider] init - isAvailable:', isAvailable);

  const save = async (key, value) => {
    try {
      console.log('[Keystore][save] key=', key, 'hasValue=', value != null);
      if (isAvailable) {
        const res = await SecureStorage.save(key, value);
        console.log('[Keystore][save] success key=', key);
        return res;
      }
      console.log('[Keystore][save] not available, no-op for key=', key);
      return null;
    } catch (err) {
      console.error('[Keystore][save] error for key=', key, err);
      return null;
    }
  };

  const get = async key => {
    try {
      console.log('[Keystore][get] key=', key);
      if (isAvailable) {
        const res = await SecureStorage.get(key);
        console.log('[Keystore][get] result for key=', key, 'present=', res != null);
        return res;
      }
      console.log('[Keystore][get] not available, returning null for key=', key);
      return null;
    } catch (err) {
      console.error('[Keystore][get] error for key=', key, err);
      return null;
    }
  };

  const remove = async key => {
    try {
      console.log('[Keystore][remove] key=', key);
      if (isAvailable) {
        const res = await SecureStorage.remove(key);
        console.log('[Keystore][remove] removed key=', key);
        return res;
      }
      console.log('[Keystore][remove] not available, no-op for key=', key);
      return null;
    } catch (err) {
      console.error('[Keystore][remove] error for key=', key, err);
      return null;
    }
  };

  const rotateMasterKey = async () => {
    try {
      console.log('[Keystore][rotateMasterKey] attempting rotation');
      if (isAvailable && typeof SecureStorage.rotateMasterKey === 'function') {
        const res = await SecureStorage.rotateMasterKey();
        console.log('[Keystore][rotateMasterKey] success');
        return res;
      }
      console.log('[Keystore][rotateMasterKey] not available or not supported');
      return null;
    } catch (err) {
      console.error('[Keystore][rotateMasterKey] error', err);
      return null;
    }
  };

  const migrateToStrongBoxIfAvailable = async () => {
    try {
      console.log('[Keystore][migrateToStrongBoxIfAvailable] attempting migration');
      if (isAvailable && typeof SecureStorage.migrateToStrongBoxIfAvailable === 'function') {
        const res = await SecureStorage.migrateToStrongBoxIfAvailable();
        console.log('[Keystore][migrateToStrongBoxIfAvailable] success');
        return res;
      }
      console.log('[Keystore][migrateToStrongBoxIfAvailable] not available or not supported');
      return null;
    } catch (err) {
      console.error('[Keystore][migrateToStrongBoxIfAvailable] error', err);
      return null;
    }
  };

  const value = useMemo(
    () => ({
      isAvailable,
      save,
      get,
      remove,
      rotateMasterKey,
      migrateToStrongBoxIfAvailable,
    }),
    [isAvailable],
  );

  return <KeystoreContext.Provider value={value}>{children}</KeystoreContext.Provider>;
};

export const useKeystore = () => {
  const ctx = useContext(KeystoreContext);
  if (!ctx) throw new Error('useKeystore must be used inside KeystoreProvider');
  return ctx;
};
