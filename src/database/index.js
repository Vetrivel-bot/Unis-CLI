import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { mySchema } from './schema';
import Contact from './models/Contact';
import Message from './models/Message';

import { getOrCreateDatabaseKey } from '../services/secureKeyManager';

/**
 * Sets up and returns an encrypted WatermelonDB database instance.
 * IMPORTANT: For encryption to work, the project MUST use the
 * `react-native-sqlcipher-storage` npm package.
 */
export const setupDatabase = async () => {
  console.log('🔐 Starting database initialization...');

  // 1. First, securely get the encryption key from the device's keychain.
  console.log('📱 Retrieving encryption key from secure storage...');
  const dbKey = await getOrCreateDatabaseKey();
  console.log('✅ Encryption key retrieved successfully');
  console.log(`🔑 Key length: ${dbKey.length * 4} bits`); // hex length * 4 bits/char

  // 2. Create the SQLite adapter.
  console.log('🔄 Creating SQLite adapter with encryption...');
  console.log('📁 Database name: Unis');
  console.log('⚡ JSI mode: false (Required for SQLCipher compatibility)');

  const adapter = new SQLiteAdapter({
    schema: mySchema,
    dbName: 'Unis',
    jsi: false, // Disabling JSI is often necessary for sqlcipher-storage to work reliably
    onSetUpError: error => {
      console.error('❌ DATABASE SETUP CRITICAL ERROR:', error);
      console.error('💥 This could be due to:');
      console.error('   - Conflicting `react-native-sqlite-storage` package is installed.');
      console.error(
        '  - The native `react-native-sqlcipher-storage` module is not linked correctly.',
      );
      console.error('   - Corrupted database file on the device (try uninstalling the app).');
      console.error('   - An issue with retrieving the encryption key.');
    },
    passphrase: dbKey,
  });

  console.log('✅ SQLite adapter created with encryption settings');

  // 3. Create the database instance with the encrypted adapter.
  console.log('🏗️ Creating WatermelonDB database instance...');
  console.log('📊 Models to register: Contact, Message');

  const database = new Database({
    adapter,
    modelClasses: [Contact, Message],
  });

  console.log('🎉 Database initialized successfully!');

  // Optional: A quick test query to verify the database is accessible after setup.
  // This helps confirm the encryption key was correct and the DB opened.
  setTimeout(async () => {
    try {
      const contactsCount = await database.get('contacts').query().fetchCount();
      console.log(`📇 Verification query successful. Initial contacts count: ${contactsCount}`);
    } catch (error) {
      console.error('❌ Failed to run verification query after setup:', error);
    }
  }, 500);

  return database;
};

/**
 * Forces a WAL checkpoint on the database.
 * This moves data from the temporary -wal file to the main encrypted .db file
 * and truncates the -wal file, effectively clearing it.
 * @param {Database} database - The active WatermelonDB instance.
 */
export const forceCheckpoint = async database => {
  if (!database || !database.adapter) {
    console.error('[Checkpoint] Cannot force checkpoint: Invalid database instance.');
    return;
  }

  try {
    console.log('[Checkpoint] ⚡ Forcing WAL checkpoint to secure temporary data...');
    // This directly executes the PRAGMA command to move data from WAL to the main DB.
    await database.adapter.unsafeExecute({
      sqls: [
        // --- THIS IS THE FIX ---
        // We must provide an empty array for the arguments, even for PRAGMA statements.
        ['PRAGMA wal_checkpoint(TRUNCATE);', []],
      ],
    });
    console.log('[Checkpoint] ✅ Checkpoint successful. Temporary log has been cleared.');
  } catch (error) {
    console.error('[Checkpoint] ❌ Failed to execute WAL checkpoint:', error);
  }
};
