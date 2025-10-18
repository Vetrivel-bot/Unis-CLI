import { NativeModules } from 'react-native';
import 'react-native-get-random-values'; // Required for uuid
import { v4 as uuidv4 } from 'uuid';

// Access the native module directly, just like your context does
const { SecureStorage } = NativeModules;

const DATABASE_KEY_ALIAS = 'com.unis.database_encryption_key';

/**
 * Retrieves the database encryption key from SecureStorage.
 * If the key does not exist, it generates a new one, saves it
 * securely, and then returns it.
 */
export const getOrCreateDatabaseKey = async (): Promise<string> => {
  if (!SecureStorage) {
    throw new Error('SecureStorage native module is not available.');
  }

  try {
    // 1. Try to get the existing key
    const existingKey = await SecureStorage.get(DATABASE_KEY_ALIAS);

    if (existingKey) {
      console.log('[SecureKeyManager] Database key successfully retrieved from storage.');
      return existingKey;
    }

    // 2. If no key exists, create and save a new one
    console.log('[SecureKeyManager] No key found. Generating and storing a new one.');
    // Generate a strong, random 256-bit key
    const newKey = uuidv4() + uuidv4();

    await SecureStorage.save(DATABASE_KEY_ALIAS, newKey);

    console.log('[SecureKeyManager] New database key saved securely.');
    return newKey;
  } catch (error) {
    console.error('[SecureKeyManager] Failed to get or create database key:', error);
    // You might want to handle this error more gracefully, e.g., by showing an error screen
    throw new Error('Could not initialize secure database key.');
  }
};
