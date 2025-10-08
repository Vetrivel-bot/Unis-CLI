import React, { useState } from 'react';
import { View, Button, Text } from 'react-native';
import RNFS from 'react-native-fs';
import { useFileEncryption } from '../../context/FileEncryptionContext';

export default function TestEncryptionNativeHmac() {
  const { encryptFile, decryptToCache } = useFileEncryption();
  const [status, setStatus] = useState('idle');

  const runTest = async () => {
    try {
      setStatus('creating-sample');
      const sampleInput = `${RNFS.DocumentDirectoryPath}/big_sample.txt`;
      // create a larger file for testing - repeated content
      const chunk = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
      let data = '';
      for (let i = 0; i < 20000; i++) data += chunk; // ~600KB-1MB depending on chunk
      await RNFS.writeFile(sampleInput, data, 'utf8');

      setStatus('encrypting');
      const { encryptedPath } = await encryptFile(sampleInput, 'big_sample.enc');

      setStatus('decrypting');
      const decryptedPath = await decryptToCache(encryptedPath, 'big_sample_decrypted.txt');

      const decrypted = await RNFS.readFile(decryptedPath, 'utf8');
      setStatus('done: ' + decrypted.slice(0, 60));

      // cleanup
      await RNFS.unlink(decryptedPath).catch(() => {});
    } catch (e) {
      console.error('test error', e);
      setStatus('error: ' + e.message);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Button title='Run Native HMAC Streaming Test' onPress={runTest} />
      <Text style={{ marginTop: 12 }}>{status}</Text>
    </View>
  );
}
