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
import {
  sendMessage,
  markAsDelivered,
  markAsRead,
  saveIncomingMessage,
} from '../../services/messageService';
import { useDatabase } from '../../context/DatabaseContext';
import { Q } from '@nozbe/watermelondb';

export default function ChatScreen() {
  const database = useDatabase();
  const [messages, setMessages] = useState([]);

  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { chatId, chatName, avatarUrl } = route.params || {};
  const scrollRef = useRef(null);

  const deliveredRef = useRef(new Set());
  const readRef = useRef(new Set());
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        if (!database) return;
        if (!chatId) return;

        const messagesCollection = database.get('messages');

        // Query messages that belong to the chat (chat_id) OR were sent by the other user (sender_id)
        const fetchedMessages = await messagesCollection
          .query(Q.or(Q.where('chat_id', chatId), Q.where('sender_id', chatId)))
          .fetch();

        // Map WatermelonDB models to the UI message shape
        const formattedMessages = fetchedMessages.map(m => {
          const raw = m._raw || {};
          // Decide sent/received: if sender_id equals chatId => it's a received message from the chat partner
          const type = raw.sender_id === chatId ? 'received' : 'sent';
          let ts = raw.timestamp;
          try {
            if (ts === undefined || ts === null) ts = Date.now();
            // If timestamp is stored as number (ms or seconds), try to coerce:
            ts = Number(ts);
            if (String(ts).length === 10) ts = ts * 1000; // seconds -> ms
            ts = new Date(ts).toISOString();
          } catch (e) {
            ts = new Date().toISOString();
          }

          return {
            id: raw.id || raw._id || m.id,
            type,
            contentType: 'text',
            text: raw.content ?? raw.ciphertext ?? '',
            status: raw.status ?? undefined,
            ts,
          };
        });

        setMessages(formattedMessages);

        console.log('[ChatScreen][Messages] Current Messages in DB:', formattedMessages);
      } catch (error) {
        console.error('[ChatScreen] Failed to fetch Message:', error);
      }
    };

    fetchMessages();
  }, [database, chatId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

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
    const onChatMessage = async msg => {
      if (!msg) return;
      console.log('[ChatScreen] onChatMessage received', msg, 'chatId:', chatId);

      if (msg.from === chatId || msg.sender_id === chatId) {
        const incoming = {
          id: msg.id,
          type: 'received',
          contentType: 'text',
          text: msg.ciphertext ?? msg.content ?? '',
          status: msg.status || 'delivered',
          ts: msg.ts ?? new Date().toISOString(),
        };

        setMessages(prev => [...prev, incoming]);

        try {
          if (database) {
            await saveIncomingMessage(database, msg);
          } else {
            console.warn(
              '[ChatScreen] No database available when trying to save incoming message.',
            );
          }
        } catch (e) {
          console.error('[ChatScreen] saveIncomingMessage failed:', e);
        }

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
  }, [chatId, isFocused, emitDelivered, emitRead, database]);

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

    // optimistic UI id
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      id: tempId,
      type: 'sent',
      contentType: 'text',
      text,
      status: 'sending',
      ts: new Date().toISOString(),
    };

    // show immediately in UI
    setMessages(prev => [...prev, optimisticMessage]);

    // persist optimistic message locally with tempId
    try {
      if (database) {
        const coll = database.collections.get('messages');
        const timestampMs = Date.now();
        await database.write(async () => {
          await coll.create(record => {
            record._raw = {
              id: tempId,
              chat_id: chatId ?? '',
              // 'me' placeholder — replace with actual local user ID if available
              sender_id: 'me',
              content: text,
              status: 'sending',
              timestamp: timestampMs,
            };
          });
        });
        console.log('[ChatScreen] persisted optimistic message to DB:', tempId);
      } else {
        console.warn('[ChatScreen] DB not ready — optimistic message not saved to DB.');
      }
    } catch (e) {
      console.error('[ChatScreen] failed to persist optimistic message:', e);
    }

    // send over socket
    try {
      const ack = await sendMessage({ toUserId: chatId, text });

      // ack should contain ack.id (server message id)
      if (!ack || !ack.id) {
        throw new Error('No ack id from server');
      }

      // update UI: replace tempId with server id and mark status 'sent'
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, id: ack.id, status: 'sent' } : m)),
      );

      // Update DB: create server-id record, then remove temp record
      try {
        if (database) {
          const coll = database.collections.get('messages');

          await database.write(async () => {
            // create server record (avoid mutating primary key of existing record)
            await coll.create(record => {
              record._raw = {
                id: ack.id,
                chat_id: chatId ?? '',
                sender_id: 'me',
                content: text,
                status: 'sent',
                timestamp: Date.now(),
              };
            });

            // try to find and destroy the temp record
            const tempRecord = await coll.find(tempId).catch(() => null);
            if (tempRecord) {
              // permanently remove local temp message
              await tempRecord.destroyPermanently();
              console.log('[ChatScreen] removed temp DB message', tempId);
            }
          });

          console.log('[ChatScreen] Created server message in DB:', ack.id);
        } else {
          console.warn('[ChatScreen] DB not available after ack; UI updated only.');
        }
      } catch (dbErr) {
        console.error('[ChatScreen] Error updating DB after ack:', dbErr);
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      // update UI to show failed
      setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m)));

      // mark optimistic DB record as failed (if exists)
      try {
        if (database) {
          const coll = database.collections.get('messages');
          await database.write(async () => {
            const rec = await coll.find(tempId).catch(() => null);
            if (rec) {
              await rec.update(r => {
                r._raw = {
                  ...r._raw,
                  status: 'failed',
                };
              });
              console.log('[ChatScreen] Marked temp message as failed in DB:', tempId);
            }
          });
        }
      } catch (dbErr) {
        console.error('[ChatScreen] Failed to mark temp message failed in DB:', dbErr);
      }
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
            ref={scrollRef}
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
