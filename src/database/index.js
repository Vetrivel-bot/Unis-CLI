import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { mySchema } from './schema';
import Contact from './models/Contact';
import Message from './models/Message';

import { getOrCreateDatabaseKey } from '../services/secureKeyManager'; // Your keychain function

/**
 * Sets up and returns an encrypted WatermelonDB database instance.
 * IMPORTANT: For encryption to work, the project MUST use the
 * `react-native-sqlcipher-storage` npm package.
 */
export const setupDatabase = async () => {
  // 1. First, securely get the encryption key from the device's keychain.
  // This is the correct approach, as it avoids hardcoding sensitive keys in code.
  const dbKey = await getOrCreateDatabaseKey();

  // 2. Create the SQLite adapter. With `react-native-sqlcipher-storage` installed,
  // WatermelonDB will automatically use it and apply the `passphrase`.
  const adapter = new SQLiteAdapter({
    schema: mySchema,
    dbName: 'Unis', // The name of your database file on the device
    jsi: true, // Recommended for performance in modern React Native
    onSetUpError: error => {
      // Crucial for debugging. This will be called if the database can't be opened,
      // which could happen with a key mismatch or corrupted file.
      console.error('Database setup error:', error);
    },
    // --- THIS IS THE ENCRYPTION KEY ---
    // The `passphrase` option tells the SQLCipher-enabled adapter to encrypt
    // the database file with this key. The database will be unreadable without it.
    passphrase: dbKey,
  });

  // 3. Create the database instance with the encrypted adapter.
  const database = new Database({
    adapter,
    modelClasses: [Contact, Message],
  });

  return database;
};
