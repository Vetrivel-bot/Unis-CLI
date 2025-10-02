// src/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import DeviceInfo from 'react-native-device-info';
import { Message } from '../types/chat'; // Assuming your types are in this path

// ---- DATABASE INTEGRATION POINT ----
// In a real app, you would import your database instance here
// import { realm } from '../db/realm';
// import { database } from '../db/watermelondb';

// --- DUMMY AUTH DATA ---
const DUMMY_ACCESS_TOKEN = 'dummy-access-token-string';
const DUMMY_REFRESH_TOKEN = 'dummy-refresh-token-string';
// ---

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initializeSocket = async () => {
      // ... (Code to get deviceId, deviceName is the same)
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = await DeviceInfo.getDeviceName();
      const SERVER_URL = 'http://your-server-address:port';

      const newSocket = io(SERVER_URL, {
        auth: {
          token: DUMMY_ACCESS_TOKEN,
          refreshToken: DUMMY_REFRESH_TOKEN,
          deviceId: deviceId,
          deviceName: deviceName,
        },
        transports: ['websocket'],
      });

      // --- GLOBAL EVENT HANDLERS ---
      newSocket.on('connect', () => {
        console.log('Socket Connected!', 'ID:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', reason => {
        console.log('Socket Disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', error => {
        console.error('Socket Connection Error:', error.message);
      });

      // --- CENTRALIZED MESSAGE HANDLER ---
      newSocket.on('receive_message', (messageData: Message) => {
        console.log('Centrally received message:', messageData);

        // **STEP 1: SAVE THE MESSAGE TO YOUR DATABASE**
        // This is the single point where all incoming messages are saved.

        // --- Example for Realm ---
        // realm.write(() => {
        //   realm.create('Message', {
        //     ...messageData,
        //     _id: messageData.id, // Realm often uses _id
        //   });
        // });

        // --- Example for WatermelonDB ---
        // database.write(async () => {
        //   const messagesCollection = database.collections.get('messages');
        //   await messagesCollection.create(message => {
        //     message._raw.id = messageData.id;
        //     message.text = messageData.text;
        //     // ... map other fields
        //   });
        // });

        // **STEP 2: That's it!** Your UI will update automatically if it's
        // observing the database query for this chat.
      });

      newSocket.on('tokens', payload => {
        console.log('Centrally received new tokens:', payload);
        // Save these tokens to your secure storage (e.g., MMKV)
      });

      setSocket(newSocket);
    };

    initializeSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
};
