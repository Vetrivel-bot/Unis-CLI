import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useIsFocused } from '@react-navigation/native';
import ProfileHeader from '../../component/layout/ProfileHeader';
import { useThemeColors } from '../../context/themeColors';
import MessageList from '../../component/ui/Chat/Messagelist';
import MessageBox from '../../component/Chat/MessageBox';
import { AppEventEmitter } from '../../services/EventEmitter';
import { sendMessage, markAsDelivered, markAsRead } from '../../services/messageService';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { chatId, chatName, avatarUrl } = route.params || {};

  const deliveredRef = useRef(new Set());
  const readRef = useRef(new Set());
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'received',
      contentType: 'text',
      text: 'Hey, hows it going?',
      ts: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'sent',
      contentType: 'text',
      text: 'Im doing great, thanks for asking! You?',
      status: 'read',
      ts: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const markDeliveredLocally = useCallback(msgId => {
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, status: 'delivered' } : m)));
    deliveredRef.current.add(msgId);
  }, []);

  const markReadLocally = useCallback(msgId => {
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, status: 'read' } : m)));
    readRef.current.add(msgId);
    deliveredRef.current.add(msgId);
  }, []);

  const emitDelivered = useCallback(
    msgId => {
      if (!msgId || deliveredRef.current.has(msgId)) return;
      markAsDelivered(msgId);
      markDeliveredLocally(msgId);
    },
    [markDeliveredLocally],
  );

  const emitRead = useCallback(
    msgId => {
      if (!msgId || readRef.current.has(msgId)) return;
      markAsRead(msgId);
      markReadLocally(msgId);
    },
    [markReadLocally],
  );

  useEffect(() => {
    const onChatMessage = msg => {
      if (!msg) return;
      if (msg.from === chatId) {
        const incoming = {
          id: msg.id,
          type: 'received',
          contentType: 'text',
          text: msg.ciphertext,
          status: msg.status || undefined,
          ts: msg.ts,
        };
        setMessages(prev => [...prev, incoming]);
        if (msg.id) emitDelivered(msg.id);
        if (isFocused && msg.id) emitRead(msg.id);
      }
    };

    const onStatusUpdate = status => {
      if (!status || !status.id) return;
      setMessages(prev =>
        prev.map(m => (m.id === status.id ? { ...m, status: status.status } : m)),
      );
      if (status.status === 'delivered') deliveredRef.current.add(status.id);
      if (status.status === 'read') readRef.current.add(status.id);
    };

    const messageSubscription = AppEventEmitter.on('newMessage', onChatMessage);
    const statusSubscription = AppEventEmitter.on('statusUpdate', onStatusUpdate);

    return () => {
      messageSubscription();
      statusSubscription();
    };
  }, [chatId, isFocused, emitDelivered, emitRead]);

  useEffect(() => {
    if (!isFocused) return;
    messages
      .filter(m => m.type === 'received' && m.id && !deliveredRef.current.has(m.id))
      .forEach(m => emitDelivered(m.id));

    messages
      .filter(m => m.type === 'received' && m.id && !readRef.current.has(m.id))
      .forEach(m => emitRead(m.id));
  }, [isFocused, messages, emitDelivered, emitRead]);

  const onMessagesViewed = useCallback(
    visibleIds => {
      if (!visibleIds || visibleIds.length === 0) return;
      for (const id of visibleIds) {
        const msg = messages.find(m => m.id === id);
        if (msg && msg.type === 'received' && !readRef.current.has(id)) {
          emitRead(id);
        }
      }
    },
    [messages, emitRead],
  );

  const handleSendMessage = async text => {
    if (!text?.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      type: 'sent',
      contentType: 'text',
      text,
      status: 'sending',
      ts: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const ack = await sendMessage({ toUserId: chatId, text });
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, id: ack.id, status: 'sent' } : m)),
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m)));
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={{ paddingBottom: 40, flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOpen ? 30 : 0}
        >
          <ProfileHeader
            title={chatName}
            avatarUrl={avatarUrl}
            screen='ChatScreen'
            onPressAvatar={() => {}}
            onPressSearch={() => {}}
          />
          <ScrollView
            style={[styles.messageContainer, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 10 }}
            keyboardShouldPersistTaps='handled'
          >
            <MessageList messages={messages} onMessagesViewed={onMessagesViewed} />
          </ScrollView>
          <MessageBox onSendMessage={handleSendMessage} />
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  messageContainer: { flex: 1 },
});
