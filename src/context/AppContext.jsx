// src/context/AppContext.js
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useKeystore } from './KeystoreContext';
import { AuthenticateApi } from '../services/api';
import { useDatabase } from './DatabaseContext';
import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

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

  const database = useDatabase();

  const [user, setUser] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [deviceName, setDeviceName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // phone and keys stored in context
  const [phone, setPhoneState] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);

  const intervalRef = useRef(null);
  const tokensRef = useRef({ accessToken: null, refreshToken: null });

  const mask = s => {
    if (!s) return null;
    try {
      if (s.length <= 10) return `${s.slice(0, 3)}...`;
      return `${s.slice(0, 6)}...${s.slice(-4)}`;
    } catch {
      return '[masked]';
    }
  };

  // --- token helpers (same as before) ---
  const mergeAndPersistTokens = async incoming => {
    if (!incoming || typeof incoming !== 'object') return;
    if (incoming.accessToken !== undefined) tokensRef.current.accessToken = incoming.accessToken;
    if (incoming.refreshToken !== undefined) tokensRef.current.refreshToken = incoming.refreshToken;

    try {
      if (incoming.accessToken !== undefined) {
        if (incoming.accessToken === null) {
          await remove('accessToken');
          console.log('[AppContext] removed persisted accessToken');
        } else {
          await save('accessToken', incoming.accessToken);
          console.log('[AppContext] saved accessToken (masked):', mask(incoming.accessToken));
        }
      }
      if (incoming.refreshToken !== undefined) {
        if (incoming.refreshToken === null) {
          await remove('refreshToken');
          console.log('[AppContext] removed persisted refreshToken');
        } else {
          await save('refreshToken', incoming.refreshToken);
          console.log('[AppContext] saved refreshToken (masked):', mask(incoming.refreshToken));
        }
      }

      try {
        await migrateToStrongBoxIfAvailable();
        console.log('[AppContext] attempted migrateToStrongBoxIfAvailable');
      } catch (e) {
        console.warn('[AppContext] migrateToStrongBoxIfAvailable error', e);
      }
    } catch (e) {
      console.error('[AppContext] error persisting tokens', e);
    }
  };

  const applyTokensSafely = async payload => {
    await mergeAndPersistTokens(payload);
  };

  const clearTokensFromSecureStorage = async () => {
    tokensRef.current.accessToken = null;
    tokensRef.current.refreshToken = null;
    try {
      await remove('accessToken');
      await remove('refreshToken');
      console.log('[AppContext] cleared tokens from keystore');
    } catch (e) {
      console.error('[AppContext][clearTokensFromSecureStorage] error removing tokens', e);
    }
  };

  const readTokensFromSecureStorage = async () => {
    try {
      const inMemory = tokensRef.current;
      if (inMemory.accessToken && inMemory.refreshToken) {
        return { accessToken: inMemory.accessToken, refreshToken: inMemory.refreshToken };
      }

      const accessToken = await get('accessToken');
      const refreshToken = await get('refreshToken');

      if (accessToken) tokensRef.current.accessToken = accessToken;
      if (refreshToken) tokensRef.current.refreshToken = refreshToken;

      if (accessToken || refreshToken) return { accessToken, refreshToken };
      return null;
    } catch (err) {
      console.error('[AppContext][readTokensFromSecureStorage] error', err);
      return null;
    }
  };

  const getAccessToken = async () => {
    if (tokensRef.current.accessToken) return tokensRef.current.accessToken;
    const stored = await readTokensFromSecureStorage();
    return stored?.accessToken ?? null;
  };

  const getRefreshToken = async () => {
    if (tokensRef.current.refreshToken) return tokensRef.current.refreshToken;
    const stored = await readTokensFromSecureStorage();
    return stored?.refreshToken ?? null;
  };

  const setAccessToken = async token => {
    await mergeAndPersistTokens({ accessToken: token });
  };

  const setRefreshToken = async token => {
    await mergeAndPersistTokens({ refreshToken: token });
  };

  const fetchWithAuth = async (input, init = {}) => {
    const token = await getAccessToken();
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.get('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(input, { ...init, headers });
  };

  // Phone helper
  const setPhone = async (newPhone, persist = true) => {
    try {
      setPhoneState(newPhone ?? null);
      if (persist) {
        if (newPhone === null || newPhone === undefined) {
          await remove('userPhone');
        } else {
          await save('userPhone', newPhone);
          try {
            await migrateToStrongBoxIfAvailable();
          } catch (e) {
            console.warn('[AppContext][setPhone] migrate error', e);
          }
        }
      }
    } catch (e) {
      console.error('[AppContext][setPhone] error persisting phone', e);
    }
  };

  // ---------------------------
  // KEYPAIR helpers (local-only)
  // ---------------------------

  const encodeB64 = b => naclUtil.encodeBase64(b);
  const decodeB64 = s => naclUtil.decodeBase64(s);

  /**
   * Ensure we have a local chat keypair. Loads from keystore if present;
   * otherwise generates, persists both public + secret, and sets state.
   *
   * RETURNS: { publicKey, privateKey }
   */
  const ensureChatKeypair = async () => {
    try {
      // Try to load existing values
      const storedPub = await get('chat_publicKey');
      const storedSecret = (await get('chat_secretKey')) || (await get('chat_privateKey')) || null;

      if (storedPub && storedSecret) {
        // already available
        setPublicKey(storedPub);
        setPrivateKey(storedSecret);
        return { publicKey: storedPub, privateKey: storedSecret };
      }

      // Not present -> generate locally
      const kp = nacl.box.keyPair();
      const pub = encodeB64(kp.publicKey);
      const priv = encodeB64(kp.secretKey);

      // Persist securely (keystore)
      await save('chat_publicKey', pub);
      await save('chat_secretKey', priv);
      // keep compatibility key name
      await save('chat_privateKey', priv);

      // attempt migrate if available (no-op if not supported)
      try {
        await migrateToStrongBoxIfAvailable();
      } catch (e) {
        // ignore migration failures here
      }

      setPublicKey(pub);
      setPrivateKey(priv);
      console.log('[AppContext] Generated + stored new chat keypair locally');
      return { publicKey: pub, privateKey: priv };
    } catch (err) {
      console.error('[AppContext] ensureChatKeypair error:', err);
      return null;
    }
  };

  // ---------------------------
  // Upsert contacts (unchanged)
  // ---------------------------
  const mapServerContactToDbFields = serverContact => {
    const id =
      serverContact.id ?? serverContact._id ?? serverContact.contactId ?? serverContact.contact_id;

    const username =
      serverContact.username ??
      serverContact.alias ??
      serverContact.name ??
      serverContact.userName ??
      '';

    const public_key =
      serverContact.PublicKey ?? serverContact.publicKey ?? serverContact.public_key ?? null;
    const last_seen = serverContact.lastSeen ?? serverContact.last_seen ?? null;
    const phoneField = serverContact.phone ?? serverContact.phoneNumber ?? null;

    return { id, username, public_key, last_seen, phone: phoneField, raw: serverContact };
  };

  const upsertContacts = async contactsArray => {
    if (!database) {
      console.warn('[AppContext][upsertContacts] no database instance available');
      return;
    }
    if (!Array.isArray(contactsArray) || contactsArray.length === 0) {
      console.log('[AppContext][upsertContacts] nothing to upsert');
      return;
    }
    const collection = database.collections.get('contacts');

    try {
      await database.write(async () => {
        for (const srv of contactsArray) {
          const mapped = mapServerContactToDbFields(srv);
          if (!mapped.id) {
            console.warn('[AppContext][upsertContacts] skipping contact with no id', srv);
            continue;
          }
          const existing = await collection.find(mapped.id).catch(() => null);
          if (existing) {
            await existing.update(record => {
              if (mapped.username !== undefined)
                record._raw = { ...record._raw, username: mapped.username };
              if (mapped.public_key !== undefined)
                record._raw = { ...record._raw, public_key: mapped.public_key };
              if (mapped.last_seen !== undefined)
                record._raw = { ...record._raw, last_seen: mapped.last_seen };
              if (mapped.phone !== undefined) record._raw = { ...record._raw, phone: mapped.phone };
            });
          } else {
            await collection.create(record => {
              record._raw = {
                id: mapped.id,
                username: mapped.username ?? '',
                public_key: mapped.public_key ?? null,
                last_seen: mapped.last_seen ?? null,
                phone: mapped.phone ?? null,
              };
            });
          }
        }
      });
      console.log('[AppContext][upsertContacts] upserted', contactsArray.length, 'contacts');
    } catch (e) {
      console.error('[AppContext][upsertContacts] error upserting contacts', e);
    }
  };

  // ---------------------------
  // signIn/signOut etc.
  // ---------------------------
  const signOut = async () => {
    await clearTokensFromSecureStorage();
    try {
      await remove('userPhone');
    } catch (e) {
      console.error('[AppContext][signOut] error removing userPhone from keystore', e);
    }
    setUser(null);
    setPhoneState(null);
    setPublicKey(null);
    setPrivateKey(null);
  };

  /**
   * signInWithTokens:
   * - persists tokens
   * - sets user
   * - persists publicKey from server if provided (but DOES NOT require server private key)
   * - ensures a local keypair exists (generate if missing)
   */
  const signInWithTokens = async (tokens, userObj) => {
    if (!tokens || !tokens.accessToken) {
      console.warn('[AppContext][signInWithTokens] called without accessToken, ignoring');
      return;
    }
    await mergeAndPersistTokens(tokens);
    const parsed = parseJwt(tokens.accessToken);
    const finalUser = userObj ?? (parsed ? { sub: parsed.sub, ...parsed } : null);
    setUser(finalUser);

    if (finalUser?.phone) {
      try {
        await setPhone(finalUser.phone);
      } catch (e) {
        console.warn('[AppContext][signInWithTokens] failed to persist phone', e);
      }
    }

    // If server returned a publicKey, persist it (server public only)
    try {
      if (finalUser?.publicKey) {
        await save('chat_publicKey', finalUser.publicKey);
        setPublicKey(finalUser.publicKey);
        // do NOT expect private key from server. Ensure we have local private key.
        await ensureChatKeypair();
      } else {
        // ensure we have keys locally
        await ensureChatKeypair();
      }
      console.log('[AppContext][signInWithTokens] keys checked/saved locally');
    } catch (e) {
      console.warn('[AppContext][signInWithTokens] failed handling keys locally', e);
    }
  };

  // rotate/migrate helpers
  const rotateAndMigrateOnce = async () => {
    try {
      await rotateMasterKey();
      console.log('[AppContext] rotateMasterKey attempted');
    } catch (e) {
      console.error('[AppContext][rotateAndMigrateOnce] rotateMasterKey error', e);
    }
    try {
      await migrateToStrongBoxIfAvailable();
      console.log('[AppContext] migrateToStrongBoxIfAvailable attempted');
    } catch (e) {
      console.error('[AppContext][rotateAndMigrateOnce] migrate error', e);
    }
  };

  // Authenticator (mostly unchanged) but ensure keys are loaded
  const Authenticator = async () => {
    try {
      if (!tokensRef.current.accessToken || !tokensRef.current.refreshToken) {
        await readTokensFromSecureStorage();
      }
      const accessToken = tokensRef.current.accessToken;
      const refreshToken = tokensRef.current.refreshToken;

      if (!accessToken) {
        console.log('[AppContext][Authenticator] no access token present, skipping auth call');
        return null;
      }

      // device info
      let localDeviceId = deviceId;
      let localDeviceName = deviceName;
      if (!localDeviceId) {
        try {
          localDeviceId = await DeviceInfo.getUniqueId();
          setDeviceId(localDeviceId);
        } catch (e) {
          console.warn('[AppContext][Authenticator] getUniqueId failed', e);
        }
      }
      if (!localDeviceName) {
        try {
          localDeviceName = await DeviceInfo.getDeviceName();
          setDeviceName(localDeviceName);
        } catch (e) {
          console.warn('[AppContext][Authenticator] getDeviceName failed', e);
        }
      }

      // phone
      let localPhone = phone;
      if (!localPhone) {
        try {
          const storedPhone = await get('userPhone');
          if (storedPhone) {
            localPhone = storedPhone;
            setPhoneState(storedPhone);
            console.log('[AppContext][Authenticator] loaded phone from keystore');
          }
        } catch (e) {
          console.warn('[AppContext][Authenticator] failed to read phone from keystore', e);
        }
      }

      // LOAD KEYS into local variables (do NOT rely on state immediately after setState)
      let localPublicKey = publicKey;
      let localPrivateKey = privateKey;
      if (!localPublicKey || !localPrivateKey) {
        try {
          const storedPub = await get('chat_publicKey');
          const storedSec = (await get('chat_secretKey')) || (await get('chat_privateKey')) || null;
          if (storedPub) {
            setPublicKey(storedPub);
            localPublicKey = storedPub;
          }
          if (storedSec) {
            setPrivateKey(storedSec);
            localPrivateKey = storedSec;
          }
        } catch (e) {
          console.warn('[AppContext][Authenticator] failed to load chat keys', e);
        }
      }

      console.log('[AppContext][Authenticator] calling AuthenticateApi with:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        phone: localPhone,
        deviceId: localDeviceId,
        deviceName: localDeviceName,
        publicKey: !!localPublicKey, // use local var for accurate value
      });

      const res = await AuthenticateApi(
        accessToken,
        refreshToken,
        localPhone,
        localDeviceId,
        localDeviceName,
        localPublicKey, // pass the actual key value
      );

      console.log('[AppContext][Authenticator] full AuthenticateApi response:', res);

      if (res && res.user) {
        setUser(res.user);

        if (res.user.publicKey) {
          setPublicKey(res.user.publicKey);
          try {
            await save('chat_publicKey', res.user.publicKey);
          } catch (e) {
            console.warn('[AppContext][Authenticator] failed to persist chat_publicKey', e);
          }
        }

        if (!phone && res.user.phone) {
          await setPhone(res.user.phone);
        }
      }

      const contactsFromResponse =
        (res && res.contacts) ||
        (res && res.data && res.data.contacts) ||
        (res && res.user && res.user.contacts) ||
        null;

      if (Array.isArray(contactsFromResponse) && contactsFromResponse.length > 0) {
        try {
          await upsertContacts(contactsFromResponse);
          await logAllContacts();
        } catch (e) {
          console.warn('[AppContext][Authenticator] upsertContacts failed', e);
        }
      } else {
        console.log('[AppContext][Authenticator] no contacts found in response');
      }

      // ensure a local keypair exists (won't contact server)
      await ensureChatKeypair();

      return res;
    } catch (e) {
      console.error('[AppContext][Authenticator] Authentication error', e);
      return null;
    }
  };

  const logAllContacts = async () => {
    try {
      const contactsCollection = database.get('contacts');
      const contacts = await contactsCollection.query().fetch();
      console.log(
        '[AppContext][Contacts] Current contacts in DB:',
        contacts.map(c => c._raw),
      );
    } catch (error) {
      console.error('[AppContext][Contacts] Failed to fetch contacts:', error);
    }
  };

  const logAllMessages = async () => {
    try {
      const coll = database.collections.get('messages');
      const msgs = await coll.query().fetch();
      console.log(
        '[DB][messages] count:',
        msgs.length,
        'raw:',
        msgs.map(m => m._raw),
      );
    } catch (e) {
      console.error('[DB][messages] failed to list messages', e);
    }
  };

  // startup: load keys/phone/tokens and ensure local keypair exists
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        try {
          const storedPhone = await get('userPhone');
          if (storedPhone) {
            setPhoneState(storedPhone);
            console.log('[AppContext][init] loaded stored phone from keystore');
          }
        } catch (e) {
          console.warn('[AppContext][init] error reading phone from keystore', e);
        }

        try {
          const storedPub = await get('chat_publicKey');
          const storedSec = (await get('chat_secretKey')) || (await get('chat_privateKey')) || null;
          if (storedPub) {
            setPublicKey(storedPub);
            console.log('[AppContext][init] loaded chat_publicKey from keystore');
          }
          if (storedSec) {
            setPrivateKey(storedSec);
            console.log('[AppContext][init] loaded chat_secretKey from keystore');
          }
        } catch (e) {
          console.warn('[AppContext][init] error reading chat keys from keystore', e);
        }

        try {
          const id = await DeviceInfo.getUniqueId();
          const name = await DeviceInfo.getDeviceName();
          if (!mounted) return;
          setDeviceId(id);
          setDeviceName(name);
          console.log('[AppContext][init] device info loaded', id, name);
        } catch (e) {
          console.warn('[AppContext][init] device info error', e);
        }

        // ensure a local keypair exists (generate if needed)
        try {
          await ensureChatKeypair();
        } catch (e) {
          console.warn('[AppContext][init] ensureChatKeypair error', e);
        }

        // rotate/migrate attempt
        try {
          await rotateAndMigrateOnce();
        } catch (e) {
          console.warn('[AppContext][init] rotateAndMigrateOnce error', e);
        }

        // read tokens and sign in if present
        try {
          const stored = await readTokensFromSecureStorage();
          if (stored?.accessToken) {
            console.log('[AppContext][init] tokens found on startup (masked):', {
              access: mask(stored.accessToken),
              refresh: mask(stored.refreshToken),
            });

            await signInWithTokens(stored);

            try {
              await Authenticator();
            } catch (e) {
              console.warn('[AppContext][init] Authenticator after signIn error', e);
            }
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
          console.log(publicKey);
          console.log(privateKey);
          console.log('[AppContext][init] finished init, isLoading=false');
        }
      }
      await logAllContacts();
      await logAllMessages();
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
        phone,
        setPhone,
        publicKey,
        setPublicKey,
        privateKey,
        setPrivateKey,
        isLoading,
        signOut,
        signInWithTokens,
        fetchWithAuth,
        getAccessToken,
        getRefreshToken,
        setAccessToken,
        setRefreshToken,
        saveTokensToSecureStorage: mergeAndPersistTokens,
        clearTokensFromSecureStorage,
        readTokensFromSecureStorage,
        rotateMasterKey,
        migrateToStrongBoxIfAvailable,
        isSecureStorageAvailable: isAvailable,
        Authenticator,
        applyTokensSafely,
        upsertContacts,
        ensureChatKeypair, // <-- exported so screens can call it directly
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
