import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import DeviceInfo from 'react-native-device-info';
import { useKeystore } from './KeystoreContext';

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
  } catch (err) {
    console.error('[AppContext][parseJwt] error parsing token', err);
    return null;
  }
};

export const AppProvider = ({ children }) => {
  const { save, get, remove, rotateMasterKey, migrateToStrongBoxIfAvailable, isAvailable } =
    useKeystore();

  const [user, setUser] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [deviceName, setDeviceName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);
  const tokensRef = useRef({ accessToken: null, refreshToken: null }); // in-memory cache

  const mask = s => {
    if (!s) return null;
    try {
      if (s.length <= 10) return `${s.slice(0, 3)}...`;
      return `${s.slice(0, 6)}...${s.slice(-4)}`;
    } catch {
      return '[masked]';
    }
  };

  // Helpers that keep the same function names you expect
  const saveTokensToSecureStorage = async tokens => {
    if (!tokens) return;
    console.log('[AppContext][saveTokensToSecureStorage] tokens present:', {
      access: !!tokens.accessToken,
      refresh: !!tokens.refreshToken,
    });

    tokensRef.current.accessToken = tokens.accessToken ?? tokensRef.current.accessToken;
    tokensRef.current.refreshToken = tokens.refreshToken ?? tokensRef.current.refreshToken;

    try {
      // persist only when keystore is available (save is no-op otherwise)
      if (tokens.accessToken !== undefined) {
        console.log(
          '[AppContext][saveTokensToSecureStorage] saving accessToken (masked):',
          mask(tokens.accessToken),
        );
        await save('accessToken', tokens.accessToken);
      }
      if (tokens.refreshToken !== undefined) {
        console.log(
          '[AppContext][saveTokensToSecureStorage] saving refreshToken (masked):',
          mask(tokens.refreshToken),
        );
        await save('refreshToken', tokens.refreshToken);
      }

      // attempt migration (no-op if not available)
      try {
        await migrateToStrongBoxIfAvailable();
        console.log(
          '[AppContext][saveTokensToSecureStorage] attempted migrateToStrongBoxIfAvailable',
        );
      } catch (e) {
        console.error(
          '[AppContext][saveTokensToSecureStorage] migrateToStrongBoxIfAvailable error',
          e,
        );
      }
    } catch (e) {
      console.error('[AppContext][saveTokensToSecureStorage] error saving tokens', e);
    }
  };

  const clearTokensFromSecureStorage = async () => {
    console.log('[AppContext][clearTokensFromSecureStorage] clearing tokens (secure & memory)');
    tokensRef.current.accessToken = null;
    tokensRef.current.refreshToken = null;
    try {
      await remove('accessToken');
      await remove('refreshToken');
      console.log('[AppContext][clearTokensFromSecureStorage] removed persisted tokens');
    } catch (e) {
      console.error(
        '[AppContext][clearTokensFromSecureStorage] error removing persisted tokens',
        e,
      );
    }
  };

  const readTokensFromSecureStorage = async () => {
    try {
      const inMemory = tokensRef.current;
      console.log('[AppContext][readTokensFromSecureStorage] inMemory tokens present:', {
        access: !!inMemory.accessToken,
        refresh: !!inMemory.refreshToken,
      });
      if (inMemory.accessToken && inMemory.refreshToken) {
        console.log(
          '[AppContext][readTokensFromSecureStorage] returning in-memory tokens (masked)',
          {
            access: mask(inMemory.accessToken),
            refresh: mask(inMemory.refreshToken),
          },
        );
        return { accessToken: inMemory.accessToken, refreshToken: inMemory.refreshToken };
      }

      // get() returns null if keystore unavailable
      console.log('[AppContext][readTokensFromSecureStorage] reading from keystore...');
      const accessToken = await get('accessToken');
      const refreshToken = await get('refreshToken');

      tokensRef.current.accessToken = accessToken ?? tokensRef.current.accessToken;
      tokensRef.current.refreshToken = refreshToken ?? tokensRef.current.refreshToken;

      console.log('[AppContext][readTokensFromSecureStorage] keystore results (masked):', {
        access: mask(accessToken),
        refresh: mask(refreshToken),
      });

      if (accessToken && refreshToken) return { accessToken, refreshToken };
      if (accessToken || refreshToken) return { accessToken, refreshToken };
      return null;
    } catch (err) {
      console.error('[AppContext][readTokensFromSecureStorage] error', err);
      return null;
    }
  };

  // PUBLIC: getAccessToken (no refresh logic)
  const getAccessToken = async () => {
    if (tokensRef.current.accessToken) {
      console.log(
        '[AppContext][getAccessToken] returning cached accessToken (masked):',
        mask(tokensRef.current.accessToken),
      );
      return tokensRef.current.accessToken;
    }
    const stored = await readTokensFromSecureStorage();
    console.log(
      '[AppContext][getAccessToken] read stored access token (masked):',
      mask(stored?.accessToken),
    );
    return stored?.accessToken ?? null;
  };

  // PUBLIC: getRefreshToken
  const getRefreshToken = async () => {
    if (tokensRef.current.refreshToken) {
      console.log(
        '[AppContext][getRefreshToken] returning cached refreshToken (masked):',
        mask(tokensRef.current.refreshToken),
      );
      return tokensRef.current.refreshToken;
    }
    const stored = await readTokensFromSecureStorage();
    console.log(
      '[AppContext][getRefreshToken] read stored refresh token (masked):',
      mask(stored?.refreshToken),
    );
    return stored?.refreshToken ?? null;
  };

  // PUBLIC: setAccessToken
  const setAccessToken = async token => {
    console.log('[AppContext][setAccessToken] token (masked):', mask(token));
    tokensRef.current.accessToken = token ?? null;
    try {
      if (token === null || token === undefined) {
        await remove('accessToken');
        console.log('[AppContext][setAccessToken] removed persisted accessToken');
      } else {
        await save('accessToken', token);
        console.log('[AppContext][setAccessToken] persisted accessToken');
        try {
          await migrateToStrongBoxIfAvailable();
          console.log(
            '[AppContext][setAccessToken] attempted migrateToStrongBoxIfAvailable after set',
          );
        } catch (e) {
          console.error('[AppContext][setAccessToken] migrateToStrongBoxIfAvailable error', e);
        }
      }
    } catch (e) {
      console.error('[AppContext][setAccessToken] error', e);
    }
  };

  // PUBLIC: setRefreshToken
  const setRefreshToken = async token => {
    console.log('[AppContext][setRefreshToken] token (masked):', mask(token));
    tokensRef.current.refreshToken = token ?? null;
    try {
      if (token === null || token === undefined) {
        await remove('refreshToken');
        console.log('[AppContext][setRefreshToken] removed persisted refreshToken');
      } else {
        await save('refreshToken', token);
        console.log('[AppContext][setRefreshToken] persisted refreshToken');
        try {
          await migrateToStrongBoxIfAvailable();
          console.log(
            '[AppContext][setRefreshToken] attempted migrateToStrongBoxIfAvailable after set',
          );
        } catch (e) {
          console.error('[AppContext][setRefreshToken] migrateToStrongBoxIfAvailable error', e);
        }
      }
    } catch (e) {
      console.error('[AppContext][setRefreshToken] error', e);
    }
  };

  // PUBLIC: fetchWithAuth (no refresh/retry, only attaches token if present)
  const fetchWithAuth = async (input, init = {}) => {
    const token = await getAccessToken();
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.get('Content-Type')) headers.set('Content-Type', 'application/json');
    console.log('[AppContext][fetchWithAuth] request:', input, 'hasAuth=', !!token);
    return fetch(input, { ...init, headers });
  };

  // PUBLIC: signOut (keeps name)
  const signOut = async () => {
    console.log('[AppContext][signOut] signing out, clearing tokens and user');
    await clearTokensFromSecureStorage();
    setUser(null);
  };

  // PUBLIC: signInWithTokens (keeps name)
  const signInWithTokens = async (tokens, userObj) => {
    if (!tokens || !tokens.accessToken) {
      console.log('[AppContext][signInWithTokens] called without accessToken, ignoring');
      return;
    }
    console.log('[AppContext][signInWithTokens] signing in with tokens (masked)', {
      access: mask(tokens.accessToken),
      refresh: mask(tokens.refreshToken),
    });
    await saveTokensToSecureStorage(tokens);
    const parsed = parseJwt(tokens.accessToken);
    const finalUser = userObj ?? (parsed ? { sub: parsed.sub, ...parsed } : null);
    console.log(
      '[AppContext][signInWithTokens] finalUser created:',
      finalUser ? { sub: finalUser.sub } : null,
    );
    setUser(finalUser);
  };

  // rotate & migrate logic: call once at startup and periodically
  const rotateAndMigrateOnce = async () => {
    try {
      console.log('[AppContext][rotateAndMigrateOnce] rotating master key (if available)');
      await rotateMasterKey();
      console.log('[AppContext][rotateAndMigrateOnce] rotateMasterKey attempted');
    } catch (e) {
      console.error('[AppContext][rotateAndMigrateOnce] rotateMasterKey error', e);
    }
    try {
      console.log(
        '[AppContext][rotateAndMigrateOnce] attempting migrate to strongbox (if available)',
      );
      await migrateToStrongBoxIfAvailable();
      console.log('[AppContext][rotateAndMigrateOnce] migrateToStrongBoxIfAvailable attempted');
    } catch (e) {
      console.error('[AppContext][rotateAndMigrateOnce] migrateToStrongBoxIfAvailable error', e);
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        try {
          const id = await DeviceInfo.getUniqueId();
          const name = await DeviceInfo.getDeviceName();
          console.log('[AppContext][init] deviceId, deviceName', id, name);
          if (!mounted) return;
          setDeviceId(id);
          setDeviceName(name);
        } catch (e) {
          console.error('[AppContext][init] device info error', e);
        }

        // immediate rotate + migrate attempt
        try {
          await rotateAndMigrateOnce();
        } catch (e) {
          console.error('[AppContext][init] rotateAndMigrateOnce error', e);
        }

        // populate user state from tokens if available
        try {
          console.log('[AppContext][init] reading stored tokens to populate user...');
          const stored = await readTokensFromSecureStorage();
          if (stored?.accessToken) {
            console.log('[AppContext][init] tokens found on startup (masked)', {
              access: mask(stored.accessToken),
              refresh: mask(stored.refreshToken),
            });
            await signInWithTokens(stored);
          } else {
            console.log('[AppContext][init] no tokens present on startup');
          }
        } catch (e) {
          console.error('[AppContext][init] error populating user from tokens', e);
        }

        intervalRef.current = setInterval(() => {
          rotateAndMigrateOnce();
        }, 24 * 60 * 60 * 1000);
      } finally {
        if (mounted) {
          setIsLoading(false);
          console.log('[AppContext][init] finished init, isLoading=false');
        }
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
  }, []); // run once

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
        getRefreshToken,
        setAccessToken,
        setRefreshToken,
        saveTokensToSecureStorage,
        clearTokensFromSecureStorage,
        readTokensFromSecureStorage,
        rotateMasterKey,
        migrateToStrongBoxIfAvailable,
        // expose keystore availability so consumers can check if tokens are actually persisted
        isSecureStorageAvailable: isAvailable,
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
