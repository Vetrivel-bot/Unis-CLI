import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { useDatabase } from "../context/DatabaseContext";

const DBtestscreen = () => {
  const database = useDatabase();
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);

  // 🔹 Reactive message loading
  useEffect(() => {
    const messagesCollection = database.get('messages');
    const subscription = messagesCollection.query().observe().subscribe(setMessages);
    return () => subscription.unsubscribe();
  }, [database]);

  // 🔹 Reactive contact loading
  useEffect(() => {
    const contactsCollection = database.get('contacts');
    const subscription = contactsCollection.query().observe().subscribe(setContacts);
    return () => subscription.unsubscribe();
  }, [database]);

  // 🔹 Add test message
  const addMessage = async () => {
    await database.write(async () => {
      const messagesCollection = database.get('messages');
      await messagesCollection.create(msg => {
        msg.chatId = 'test_chat';
        msg.senderId = 'user_123';
        msg.content = 'Hello World!';
        msg.status = 'sent';
        msg.timestamp = Date.now();
      });
    });
  };

  // 🔹 Delete first message
  const deleteFirstMessage = async () => {
    await database.write(async () => {
      if (messages.length > 0) {
        await messages[0].markAsDeleted();
        await messages[0].destroyPermanently();
      }
    });
  };

  // 🔹 Add test contact
  const addContact = async () => {
    await database.write(async () => {
      const contactsCollection = database.get('contacts');
      await contactsCollection.create(contact => {
        contact._raw.id = `contact_${Date.now()}`; // unique ID
        contact.username = 'Test User';
        contact.publicKey = 'public_key_123';
        contact.lastSeen = Date.now();
      });
    });
  };

  // 🔹 Delete first contact
  const deleteFirstContact = async () => {
    await database.write(async () => {
      if (contacts.length > 0) {
        await contacts[0].markAsDeleted();
        await contacts[0].destroyPermanently();
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* Message Controls */}
      <Text style={styles.title}>Messages</Text>
      <Button title="Add Message" onPress={addMessage} />
      <Button title="Delete First Message" onPress={deleteFirstMessage} color="red" />

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>ID:</Text> {item.id}</Text>
            <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Chat ID:</Text> {item.chatId}</Text>
            <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Sender ID:</Text> {item.senderId}</Text>
            <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Content:</Text> {item.content}</Text>
            <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Status:</Text> {item.status}</Text>
            <Text style={styles.subText}><Text style={{ fontWeight: 'bold' }}>Timestamp:</Text> {new Date(item.timestamp).toLocaleString()}</Text>
          </View>
        )}
      />

      {/* Contact Controls */}
      <Text style={[styles.title, { marginTop: 20 }]}>Contacts</Text>
      <Button title="Add Contact" onPress={addContact} />
      <Button title="Delete First Contact" onPress={deleteFirstContact} color="red" />

      <FlatList
        data={contacts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>ID:</Text> {item.id}</Text>
            <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Username:</Text> {item.username}</Text>
            <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Public Key:</Text> {item.publicKey}</Text>
            <Text style={styles.subText}><Text style={{ fontWeight: 'bold' }}>Last Seen:</Text> {item.lastSeen ? new Date(item.lastSeen).toLocaleString() : '-'}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginVertical: 12 },
  item: { marginVertical: 6, padding: 10, backgroundColor: '#f2f2f2', borderRadius: 6 },
  text: { fontSize: 16 },
  subText: { fontSize: 12, color: 'gray' },
});

export default DBtestscreen;
