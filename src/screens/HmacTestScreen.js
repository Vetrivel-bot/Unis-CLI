import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { useFileEncryption } from '../context/FileEncryptionContext';
import { Buffer } from 'buffer';
import Message from "../database/models/Message";


export default function HmacTestScreen() {
  const HmacTestScreen = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let subscription; // declare outside for cleanup

    const observeMessages = async () => {
      const database = await setupDatabase();
      const messagesCollection = database.get('messages');

      // 👇 Observe database changes in real-time
      subscription = messagesCollection
        .query()
        .observe()
        .subscribe(setMessages);
    };

    observeMessages();

    // 👇 Clean up when screen unmounts
    return () => subscription?.unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        Stored Messages (Live)
      </Text>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#ddd',
            }}
          >
            <Text style={{ fontWeight: 'bold' }}>Chat ID: {item.chatId}</Text>
            <Text>Sender ID: {item.senderId}</Text>
            <Text>Content: {item.content}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Time: {new Date(item.timestamp).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
};



}
