import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { useFileEncryption } from '../context/FileEncryptionContext';
import { Buffer } from 'buffer';

export default function HmacTestScreen() {
  // Get all the necessary functions from your context
  const { encryptFile, decryptToCache, listEncryptedFiles, deleteEncryptedFile } =
    useFileEncryption();

  const [log, setLog] = useState('Ready.');
  const appendLog = msg => setLog(prev => prev + '\n' + msg);

  // --- NEW --- File Management State
  const [storedFiles, setStoredFiles] = useState([]);

  // --- NEW --- Function to load the list of stored encrypted files
  const loadStoredFiles = async () => {
    try {
      appendLog('Refreshing file list...');
      const files = await listEncryptedFiles();
      setStoredFiles(files);
      appendLog(`Found ${files.length} encrypted files.`);
    } catch (err) {
      appendLog(`❌ Error loading files: ${err.message}`);
    }
  };

  // --- NEW --- Load files when the component first opens
  useEffect(() => {
    loadStoredFiles();
  }, []);

  // --- NEW --- Handler for the delete button
  const handleDeleteFile = async filePath => {
    try {
      await deleteEncryptedFile(filePath);
      Alert.alert('Success', `Deleted ${filePath.split('/').pop()}`);
      // Refresh the list after deleting
      await loadStoredFiles();
    } catch (err) {
      Alert.alert('Error', `Failed to delete file: ${err.message}`);
    }
  };

  // Helper to pause UI briefly between writes (avoids freezing)
  const delay = ms => new Promise(res => setTimeout(res, ms));

  // Writes a large file in small chunks asynchronously
  const createLargeFile = async (path, totalBytes, type) => {
    await RNFS.writeFile(path, '', 'utf8'); // clear/create empty
    const chunkSize = 64 * 1024; // 64KB chunks
    const iterations = Math.ceil(totalBytes / chunkSize);
    const chunk = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\n'.repeat(200);

    for (let i = 0; i < iterations; i++) {
      const data =
        type === 'binary'
          ? Buffer.from(
              Array.from({ length: chunkSize }, () => Math.floor(Math.random() * 256)),
            ).toString('base64')
          : chunk;
      await RNFS.appendFile(path, data, type === 'binary' ? 'base64' : 'utf8');

      if (i % 20 === 0) appendLog(`Writing chunk ${i + 1}/${iterations}...`);
      if (i % 40 === 0) await delay(50); // yield control
    }
  };

  const runHmacTest = async () => {
    try {
      setLog('📁 Starting AES-GCM multi-file creation test...');

      const testFiles = [
        { name: 'sample_text_1mb.txt', size: 1 * 1024 * 1024, type: 'text' },
        { name: 'sample_json.json', size: 256 * 1024, type: 'json' },
      ];

      for (const file of testFiles) {
        appendLog(`\n🧪 Creating and encrypting: ${file.name}...`);
        const path = `${RNFS.DocumentDirectoryPath}/${file.name}`;

        if (file.type === 'text') {
          await createLargeFile(path, file.size, file.type);
        } else if (file.type === 'json') {
          const obj = { id: 1, name: 'Test', data: Array(10000).fill('abc123') };
          await RNFS.writeFile(path, JSON.stringify(obj), 'utf8');
        }

        const enc = await encryptFile(path, `${file.name}.enc`);
        appendLog(`✅ Encrypted: ${file.name}.enc`);

        // --- MODIFIED --- Only cleaning up the original, unencrypted file
        await RNFS.unlink(path).catch(() => {});
        appendLog(`🧹 Cleaned up original ${file.name}`);
      }

      appendLog('\n✅ All test files created and encrypted successfully!');
      // --- NEW --- Refresh the file list after creating new files
      await loadStoredFiles();
    } catch (err) {
      appendLog(`❌ Error: ${err?.message ?? String(err)}`);
      console.error('AES-GCM Multi Test Error:', err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Test Runner Section */}
      <Text style={styles.title}>🧪 Create Encrypted Files</Text>
      <Button title='Run Creation Test' onPress={runHmacTest} />
      <View style={styles.outputBox}>
        <Text style={styles.outputText}>{log}</Text>
      </View>

      {/* --- NEW --- File Management Section */}
      <View style={styles.divider} />
      <Text style={styles.title}>🗄️ Stored Encrypted Files</Text>
      <Button title='Refresh List' onPress={loadStoredFiles} />

      {storedFiles.length === 0 ? (
        <Text style={styles.emptyText}>No encrypted files found.</Text>
      ) : (
        <View style={styles.fileList}>
          {storedFiles.map(filePath => (
            <View key={filePath} style={styles.fileItem}>
              <Text style={styles.filePath} numberOfLines={1}>
                {filePath.split('/').pop()}
              </Text>
              <Button title='Delete' color='#ff5c5c' onPress={() => handleDeleteFile(filePath)} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  outputBox: {
    marginTop: 20,
    backgroundColor: '#f3f3f3',
    padding: 10,
    borderRadius: 8,
    minHeight: 250,
    maxHeight: 250,
  },
  outputText: { fontSize: 14, fontFamily: 'monospace' },
  divider: {
    height: 2,
    backgroundColor: '#e0e0e0',
    marginVertical: 30,
  },
  fileList: {
    marginTop: 20,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filePath: {
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
  },
});
