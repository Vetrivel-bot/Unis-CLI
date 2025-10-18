// CryptoTestScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SecureChatManager, useSecureKeys, generateSigningKeyPair } from '../../utils/crypto'; // Import from your crypto module

import { generateKeyPair, encryptMessage, decryptMessage } from '../../utils/crypto/chat-crypto';

const CryptoTestScreen = () => {
  // Use secure keys hook
  const secureKeys = useSecureKeys();

  const [alicetestKeys, setAlicetestKeys] = useState(null);
  const [bobtestKeys, setBobtestKeys] = useState(null);

  // State for chat managers
  const [aliceManager, setAliceManager] = useState(null);
  const [bobManager, setBobManager] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Other state
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [aliceKeys, setAliceKeys] = useState(null);
  const [bobKeys, setBobKeys] = useState(null);
  const [sessionId, setsessionId] = useState('test_session_1');
  const [isSessionEstablished, setIsSessionEstablished] = useState(false);

  // Initialize chat managers
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        setAlicetestKeys(generateKeyPair());
        setBobtestKeys(generateKeyPair());
        // Create Alice's manager
        const alice = new SecureChatManager(secureKeys);
        const aliceIdentity = await alice.initialize();
        setAliceManager(alice);
        setAliceKeys(aliceIdentity);

        // Create Bob's manager with a different secure keys instance
        // For testing, we'll create a simple mock secure keys for Bob
        const bobSecureKeys = createMockSecureKeys();
        const bob = new SecureChatManager(secureKeys);
        const bobIdentity = await bob.initialize();
        setBobManager(bob);
        setBobKeys(bobIdentity);

        setIsInitialized(true);

        // Establish session
        await establishSession(alice, bob, aliceIdentity, bobIdentity, sessionId);
      } catch (error) {
        console.error('Initialization failed:', error);
        Alert.alert('Error', `Initialization failed: ${error.message}`);
      }
    };

    initializeManagers();
  }, []);

  // Establish session between Alice and Bob
  // In CryptoTestScreen.jsx - FIXED session establishment
  const establishSession = async (alice, bob, aliceIdentity, bobIdentity) => {
    try {
      const bobpeerPublicKey = await bob.initSession();
      // Alice starts session and shares her salt with Bob
      const aliceSessionData = await alice.startSession(
        bobpeerPublicKey.publicKey,
        bobIdentity.publicKey,
        sessionId,
      );

      console.log('Alice session data:', {
        ephemeralKey: aliceSessionData.ephemeralPublicKey.substring(0, 20),
        salt: aliceSessionData.salt.substring(0, 20),
      });

      // Bob uses the SAME salt that Alice generated
      const bobSessionData = await bob.startSession(
        aliceSessionData.ephemeralPublicKey,
        aliceIdentity.publicKey,
        sessionId,
        aliceSessionData.salt, // Use Alice's salt
        bobpeerPublicKey, // Use Bob's ephemeral key
      );

      console.log('Bob session data:', {
        ephemeralKey: bobSessionData.ephemeralPublicKey.substring(0, 20),
        salt: bobSessionData.salt.substring(0, 20),
      });

      // Verify sessions are consistent
      verifySharedSecrets(alice, bob, sessionId);

      setIsSessionEstablished(true);
      addToConversation('System', 'Secure session established!', 'system');
    } catch (error) {
      console.error('Session setup failed:', error);
      Alert.alert('Error', `Failed to establish session: ${error.message}`);
    }
  };

  // Add to CryptoTestScreen.jsx
  const verifySharedSecrets = (aliceManager, bobManager, sessionId) => {
    try {
      const aliceSession = aliceManager.sessions.get(sessionId);
      const bobSession = bobManager.sessions.get(sessionId);

      console.log('=== SHARED SECRET VERIFICATION ===');
      console.log('Alice sharedSecret:', aliceSession.sharedSecret);
      console.log('Bob sharedSecret:', bobSession.sharedSecret);
      console.log('Shared secrets match:', aliceSession.sharedSecret === bobSession.sharedSecret);

      console.log('Alice messageKey:', aliceSession.messageKey);
      console.log('Bob messageKey:', bobSession.messageKey);
      console.log('Message keys match:', aliceSession.messageKey === bobSession.messageKey);

      console.log('Alice salt:', aliceSession.salt);
      console.log('Bob salt:', bobSession.salt);
      console.log('Salts match:', aliceSession.salt === bobSession.salt);
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  // Mock secure keys for Bob (since we can't use the hook twice)
  const createMockSecureKeys = () => {
    return {
      saveIdentityKeys: async keys => {
        // Mock implementation - in real app, you'd use proper storage
        console.log('[Bob] Saving identity keys:', keys.publicKey.substring(0, 20));
        return true;
      },
      loadIdentityKeys: async () => {
        // Return null to force new key generation
        return null;
      },
      saveSession: async (sessionId, sessionData) => {
        console.log(`[Bob] Saving session ${sessionId}`);
        return true;
      },
      loadSession: async sessionId => {
        // Mock - no persisted sessions
        return null;
      },
      removeSession: async sessionId => {
        console.log(`[Bob] Removing session ${sessionId}`);
        return true;
      },
      clearAllData: async () => {
        console.log('[Bob] Clearing all data');
        return true;
      },
      isKeystoreAvailable: false,
    };
  };

  // Send message from Alice to Bob
  const sendMessage = async () => {
    if (!message.trim() || !isSessionEstablished || !aliceManager || !bobManager) return;

    try {
      const originalMessage = message;
      setMessage('');

      // Alice encrypts the message
      const encryptedMessage = encryptMessage({
        senderSecretKeyB64: alicetestKeys.secretKey,
        recipientPublicKeyB64: bobtestKeys.publicKey,
        message: originalMessage,
      });

      addToConversation('Alice', originalMessage, 'sent');
      addToConversation('System', `Encrypted: ${encryptedMessage}`, 'system');

      // Simulate network delay
      setTimeout(async () => {
        try {
          // Bob receives and decrypts the message
          const decryptedMessage = decryptMessage({
            recipientSecretKeyB64: bobtestKeys.secretKey,
            senderPublicKeyB64: alicetestKeys.publicKey,
            payloadB64: encryptedMessage,
          });

          addToConversation('Bob', decryptedMessage, 'received');
          addToConversation('System', bobtestKeys.secretKey, 'success');
        } catch (decryptError) {
          console.error('Decryption failed:', decryptError);
          addToConversation('System', `❌ Decryption failed: ${decryptError.message}`, 'error');
        }
      }, 500);
    } catch (error) {
      console.error('Encryption failed:', error);
      Alert.alert('Encryption Error', error.message);
    }
  };

  // Send message from Bob to Alice
  const sendMessageFromBob = async () => {
    if (!message.trim() || !isSessionEstablished || !aliceManager || !bobManager) return;

    try {
      const originalMessage = message;
      setMessage('');

      // Bob encrypts the message
      const encryptedMessage = encryptMessage({
        senderSecretKeyB64: bobtestKeys.secretKey,
        recipientPublicKeyB64: alicetestKeys.publicKey,
        message: originalMessage,
      });

      addToConversation('Bob', originalMessage, 'sent');
      addToConversation('System', `Encrypted: ${encryptedMessage}`, 'system');

      // Simulate network delay
      setTimeout(async () => {
        try {
          // Alice receives and decrypts the message
          const decryptedMessage = decryptMessage({
            recipientSecretKeyB64: alicetestKeys.secretKey,
            senderPublicKeyB64: bobtestKeys.publicKey,
            payloadB64: encryptedMessage,
          });

          addToConversation('Alice', decryptedMessage, 'received');
          addToConversation('System', '✓ Message decrypted successfully', 'success');
        } catch (decryptError) {
          console.error('Decryption failed:', decryptError);
          addToConversation('System', `❌ Decryption failed: ${decryptError.message}`, 'error');
        }
      }, 500);
    } catch (error) {
      console.error('Encryption failed:', error);
      Alert.alert('Encryption Error', error.message);
    }
  };

  const addToConversation = (sender, text, type) => {
    setConversation(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender,
        text,
        type,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const clearConversation = () => {
    setConversation([]);
  };

  const testEncryptionDecryption = async () => {
    if (!aliceManager || !bobManager) return;

    try {
      const testMessage = 'Hello, this is a test message!';
      addToConversation('System', `Testing with: "${testMessage}"`, 'system');

      // Alice encrypts
      const encrypted = await aliceManager.encryptMessage(sessionId, testMessage);
      addToConversation('System', `Encrypted successfully`, 'system');

      // Bob decrypts
      const decrypted = await bobManager.decryptMessage(encrypted);
      addToConversation('System', `Decrypted: "${decrypted}"`, 'system');

      if (decrypted === testMessage) {
        addToConversation('System', '✅ Test passed!', 'success');
      } else {
        addToConversation('System', '❌ Test failed!', 'error');
      }
    } catch (error) {
      addToConversation('System', `❌ Test error: ${error.message}`, 'error');
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Initializing Crypto...</Text>
        <Text>Alice: {aliceManager ? '✅ Ready' : '⏳ Loading'}</Text>
        <Text>Bob: {bobManager ? '✅ Ready' : '⏳ Loading'}</Text>
        <Text>Keystore: {secureKeys.isKeystoreAvailable ? '✅ Available' : '❌ Unavailable'}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>🔒 Crypto Chat Test</Text>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Session: {isSessionEstablished ? '✅ Established' : '⏳ Setting up'}
        </Text>
        <Text style={styles.statusText}>
          Keystore: {secureKeys.isKeystoreAvailable ? '✅ Available' : '❌ Unavailable'}
        </Text>
      </View>

      {/* Keys Display */}
      <View style={styles.keysContainer}>
        <Text style={styles.keysTitle}>Identity Keys:</Text>
        <Text style={styles.keyText}>Alice: {aliceKeys?.publicKey?.substring(0, 30)}...</Text>
        <Text style={styles.keyText}>Bob: {bobKeys?.publicKey?.substring(0, 30)}...</Text>
      </View>

      {/* Conversation */}
      <ScrollView style={styles.conversationContainer}>
        {conversation.map(msg => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.type === 'sent' && styles.sentMessage,
              msg.type === 'received' && styles.receivedMessage,
              msg.type === 'system' && styles.systemMessage,
              msg.type === 'error' && styles.errorMessage,
              msg.type === 'success' && styles.successMessage,
            ]}
          >
            <Text style={styles.senderText}>{msg.sender}</Text>
            <Text style={styles.messageText}>{msg.text}</Text>
            <Text style={styles.timestampText}>{msg.timestamp}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder='Type a message...'
          placeholderTextColor='#999'
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.aliceButton]}
            onPress={sendMessage}
            disabled={!isSessionEstablished}
          >
            <Text style={styles.buttonText}>Send as Alice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.bobButton]}
            onPress={sendMessageFromBob}
            disabled={!isSessionEstablished}
          >
            <Text style={styles.buttonText}>Send as Bob</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.testButtons}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={testEncryptionDecryption}
            disabled={!isSessionEstablished}
          >
            <Text style={styles.buttonText}>Run Test</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearConversation}>
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  statusBar: {
    backgroundColor: '#e9e9e9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  keysContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  keysTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  keyText: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  conversationContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: '85%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E9EB',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#FFF3CD',
    maxWidth: '95%',
  },
  errorMessage: {
    alignSelf: 'center',
    backgroundColor: '#F8D7DA',
    maxWidth: '95%',
  },
  successMessage: {
    alignSelf: 'center',
    backgroundColor: '#D1EDD1',
    maxWidth: '95%',
  },
  senderText: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 2,
    color: '#333',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  timestampText: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 4,
    textAlign: 'right',
  },
  controls: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    opacity: 1,
  },
  aliceButton: {
    backgroundColor: '#007AFF',
  },
  bobButton: {
    backgroundColor: '#34C759',
  },
  testButton: {
    backgroundColor: '#FF9500',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CryptoTestScreen;
