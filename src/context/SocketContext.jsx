import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback, // 1. Import useCallback
} from 'react';
import { io } from 'socket.io-client';
import DeviceInfo from 'react-native-device-info';
import { useAppContext } from './AppContext';
import { API_BASE_URL } from '@env';
import { useDatabase } from '../context/DatabaseContext'; // << add this

import { registerSocketEvents } from '../socket/socketEvents';
// We still need the message service initializer from our previous refactor
import { initMessageService } from '../services/messageService';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const database = useDatabase(); // << add this
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const {
    user,
    setUser,
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    clearTokensFromSecureStorage,
    signInWithTokens,
  } = useAppContext();

  const SERVER_URL = API_BASE_URL;

  // --- REFACTORED SECTION 1: Stabilize the connection function ---
  // The entire connection logic is wrapped in useCallback.
  // This function will not be recreated on every render, improving performance.
  const connectAndSetupSocket = useCallback(async () => {
    // Prevent multiple concurrent connection attempts
    if (socketRef.current?.connecting || socketRef.current?.connected) {
      console.log('[SocketProvider] Connection attempt skipped: already connecting or connected.');
      return;
    }

    try {
      console.log('[SocketProvider] Reading tokens for connection...');
      const access = await getAccessToken();
      const refresh = await getRefreshToken();

      if (!access) {
        console.log('[SocketProvider] No access token found, not connecting.');
        return;
      }

      // This logic ensures the user object is populated before connecting
      if (!user) {
        await signInWithTokens({ accessToken: access, refreshToken: refresh ?? undefined });
      }

      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = await DeviceInfo.getDeviceName();

      console.log('[SocketProvider] Creating socket to', SERVER_URL);
      const newSocket = io(SERVER_URL, {
        auth: { token: access, refreshToken: refresh, deviceId, deviceName },
        transports: ['websocket'],
      });

      // --- Centralized Event Handling ---

      // Handle setting connection status for the app
      newSocket.on('connect', () => {
        console.log('[SocketProvider] Socket connected:', newSocket.id);
        setIsConnected(true);
      });
      newSocket.on('disconnect', reason => {
        console.log('[SocketProvider] Socket disconnected:', reason);
        setIsConnected(false);
      });

      // Handle initial connection failure (e.g., bad tokens)
      newSocket.once('connect_error', async error => {
        console.error('[SocketProvider] Initial connection failed:', error);
        // Clean up session if the server rejects the initial connection
        await clearTokensFromSecureStorage();
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        newSocket.disconnect();
      });

      // Register all our modular event handlers (for messages, auth updates, etc.)
      registerSocketEvents(newSocket, { setUser, setAccessToken, setRefreshToken, database });

      // Initialize our message service for sending events
      initMessageService(newSocket);

      // Update state and ref
      setSocket(newSocket);
      socketRef.current = newSocket;
    } catch (e) {
      console.error('[SocketProvider] Error in connectAndSetupSocket:', e);
    }
  }, [
    user,
    getAccessToken,
    getRefreshToken,
    signInWithTokens,
    clearTokensFromSecureStorage,
    setAccessToken,
    setRefreshToken,
    setUser,
    database,
  ]);

  // --- REFACTORED SECTION 2: Simplified useEffect Hooks ---

  // Effect 1: Handles CONNECTING when the user logs in.
  useEffect(() => {
    // If we have a user object but no active socket, it means we just logged in.
    if (user && !socketRef.current) {
      console.log('[SocketProvider] User detected, attempting to connect socket.');
      connectAndSetupSocket();
    }
  }, [user, connectAndSetupSocket]);

  // Effect 2: Handles DISCONNECTING and cleanup.
  useEffect(() => {
    // This function will run when the component unmounts.
    const cleanup = () => {
      const currentSocket = socketRef.current;
      if (currentSocket) {
        console.log('[SocketProvider] Cleaning up and disconnecting socket.');
        currentSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };

    // If the user logs out (user object becomes null) while a socket is active,
    // we should disconnect immediately.
    if (!user && socketRef.current) {
      cleanup();
    }

    // Return the cleanup function to be run on component unmount.
    return cleanup;
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
};
