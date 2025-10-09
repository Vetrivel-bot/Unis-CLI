import React from 'react';
import { SecureChatManager } from './chatManager';
import { useSecureKeys } from './keyStorage';

// -------------------- React Hook for Easy Usage --------------------
export const useSecureChat = () => {
  const secureKeys = useSecureKeys();
  const [chatManager, setChatManager] = React.useState(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const init = async () => {
      try {
        setError(null);
        const manager = new SecureChatManager(secureKeys);
        await manager.initialize();
        setChatManager(manager);
        setIsInitialized(true);
      } catch (err) {
        console.error('[useSecureChat] Initialization failed:', err);
        setError(err.message);
        setIsInitialized(false);
      }
    };

    init();

    return () => {
      if (chatManager) {
        chatManager.cleanup();
      }
    };
  }, [secureKeys.isKeystoreAvailable]);

  return {
    chatManager,
    isInitialized,
    isKeystoreAvailable: secureKeys.isKeystoreAvailable,
    error,
  };
};

// -------------------- Quick Session Hook --------------------
export const useQuickSession = (peerPublicKey, peerSigningKey, sessionId) => {
  const { chatManager, isInitialized } = useSecureChat();
  const [sessionData, setSessionData] = React.useState(null);
  const [isSessionReady, setIsSessionReady] = React.useState(false);

  React.useEffect(() => {
    const setupSession = async () => {
      if (!chatManager || !peerPublicKey || !peerSigningKey || !sessionId) return;

      try {
        const data = await chatManager.startSession(peerPublicKey, peerSigningKey, sessionId);
        setSessionData(data);
        setIsSessionReady(true);
      } catch (error) {
        console.error('[useQuickSession] Failed to setup session:', error);
      }
    };

    setupSession();
  }, [chatManager, peerPublicKey, peerSigningKey, sessionId]);

  return {
    chatManager,
    isInitialized,
    isSessionReady,
    sessionData,
  };
};
