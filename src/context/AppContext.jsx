import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';

const { SecureStorage } = NativeModules || {};
const API_BASE_URL = 'http://10.208.124.13:3000';

const AppContext = createContext(undefined);

const atobPoly = str => {
  if (typeof globalThis?.atob === 'function') return globalThis.atob(str);
  try {
    // eslint-disable-next-line no-undef
    return Buffer.from(str, 'base64').toString('binary');
  } catch {
    return '';
  }
};

const parseJwt = token => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atobPoly(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Minimal secure storage helpers that use NativeModules.SecureStorage if available.
 * Falls back to AsyncStorage if @react-native-async-storage/async-storage is installed.
 */
const getAsyncStorageFallback = async () => {
  try {
    // dynamic require to avoid bundling errors when not installed
    // eslint-disable-next-line global-require
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  } catch {
    return null;
  }
};

const useSecureHelpers = () => {
  const fallbackRef = useRef(null);

  const ensureFallback = async () => {
    if (fallbackRef.current) return fallbackRef.current;
    fallbackRef.current = await getAsyncStorageFallback();
    return fallbackRef.current;
  };

  const save = async (key, value) => {
    try {
      if (SecureStorage && SecureStorage.save) {
        return await SecureStorage.save(key, value);
      }
      const AsyncStorage = await ensureFallback();
      if (AsyncStorage) return await AsyncStorage.setItem(key, value);
      // if neither available, silently fail (tokens won't persist)
    } catch (e) {
      // ignore
    }
  };

  const get = async key => {
    try {
      if (SecureStorage && SecureStorage.get) {
        return await SecureStorage.get(key);
      }
      const AsyncStorage = await ensureFallback();
      if (AsyncStorage) return await AsyncStorage.getItem(key);
      return null;
    } catch {
      return null;
    }
  };

  const remove = async key => {
    try {
      if (SecureStorage && SecureStorage.remove) {
        return await SecureStorage.remove(key);
      }
      const AsyncStorage = await ensureFallback();
      if (AsyncStorage) return await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  // extra wrappers to call native functions if present
  const rotateMasterKey = async () => {
    try {
      if (SecureStorage && SecureStorage.rotateMasterKey) {
        return await SecureStorage.rotateMasterKey();
      }
      return null;
    } catch {
      return null;
    }
  };

  const migrateToStrongBoxIfAvailable = async () => {
    try {
      if (SecureStorage && SecureStorage.migrateToStrongBoxIfAvailable) {
        return await SecureStorage.migrateToStrongBoxIfAvailable();
      }
      return null;
    } catch {
      return null;
    }
  };

  return { save, get, remove, rotateMasterKey, migrateToStrongBoxIfAvailable };
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [deviceName, setDeviceName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);
  const { save, get, remove, rotateMasterKey, migrateToStrongBoxIfAvailable } = useSecureHelpers();

  // Helpers that keep the same function names you expect
  const saveTokensToSecureStorage = async tokens => {
    if (!tokens) return;
    await save('accessToken', tokens.accessToken);
    await save('refreshToken', tokens.refreshToken);
  };

  const clearTokensFromSecureStorage = async () => {
    await remove('accessToken');
    await remove('refreshToken');
  };

  const readTokensFromSecureStorage = async () => {
    try {
      const accessToken = await get('accessToken');
      const refreshToken = await get('refreshToken');
      if (accessToken && refreshToken) return { accessToken, refreshToken };
      return null;
    } catch {
      return null;
    }
  };

  // PUBLIC: getAccessToken (no refresh logic)
  const getAccessToken = async () => {
    const stored = await readTokensFromSecureStorage();
    return stored?.accessToken ?? null;
  };

  // PUBLIC: fetchWithAuth (no refresh/retry, only attaches token if present)
  const fetchWithAuth = async (input, init = {}) => {
    const token = await getAccessToken();
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.get('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(input, { ...init, headers });
  };

  // PUBLIC: signOut (keeps name)
  const signOut = async () => {
    await clearTokensFromSecureStorage();
    setUser(null);
  };

  // PUBLIC: signInWithTokens (keeps name)
  const signInWithTokens = async (tokens, userObj) => {
    if (!tokens || !tokens.accessToken) return;
    await saveTokensToSecureStorage(tokens);
    const parsed = parseJwt(tokens.accessToken);
    const finalUser = userObj ?? (parsed ? { sub: parsed.sub, ...parsed } : null);
    setUser(finalUser);
  };

  // rotate & migrate logic: call once at startup and periodically
  const rotateAndMigrateOnce = async () => {
    try {
      // rotate master key
      await rotateMasterKey();
    } catch (e) {
      // ignore rotation errors
    }
    try {
      await migrateToStrongBoxIfAvailable();
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        // device info
        try {
          const id = await DeviceInfo.getUniqueId();
          const name = await DeviceInfo.getDeviceName();
          if (!mounted) return;
          setDeviceId(id);
          setDeviceName(name);
        } catch {
          // ignore device info errors
        }

        // attempt immediate migrate (if possible) and rotate once
        try {
          await rotateAndMigrateOnce();
        } catch {
          // ignore
        }

        // load tokens to populate user state (without parsing for expiry)
        try {
          const stored = await readTokensFromSecureStorage();
          if (stored?.accessToken) {
            const payload = parseJwt(stored.accessToken);
            const maybeUser = payload ? { sub: payload.sub, ...payload } : null;
            setUser(maybeUser);
          }
        } catch {
          // ignore
        }

        // schedule periodic rotate + migrate: every 24 hours
        // interval in ms: 24 * 60 * 60 * 1000 = 86400000
        intervalRef.current = setInterval(() => {
          rotateAndMigrateOnce();
        }, 24 * 60 * 60 * 1000);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        deviceId,
        deviceName,
        isLoading,
        signOut,
        signInWithTokens,
        fetchWithAuth,
        getAccessToken,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
};
