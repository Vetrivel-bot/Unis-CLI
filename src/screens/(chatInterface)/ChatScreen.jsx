// src/screens/ChatScreen.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
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
import { useAppContext } from '../../context/AppContext';

// crypto helpers
import { encryptMessage, decryptMessage } from '../../utils/crypto/chat-crypto'; // adjust path if necessary

export default function ChatScreen() {
  const database = useDatabase();
  const [messages, setMessages] = useState([]);
  const { publicKey, privateKey } = useAppContext();
  console.log('Public Key: ', publicKey, '\n', 'Private Key: ', privateKey);

  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { chatId, chatName, avatarUrl } = route.params || {};
  const scrollRef = useRef(null);

  const deliveredRef = useRef(new Set());
  const readRef = useRef(new Set());
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // --- helper: detect simple NaCl key shape (heuristic) ---
  const isNaClKey = keyB64 => {
    if (!keyB64 || typeof keyB64 !== 'string') return false;
    // NaCl box keys are 32 bytes -> base64 length around 44 (with padding)
    // Heuristic: ensure it's not a PEM / RSA key and length within plausible range.
    if (keyB64.includes('BEGIN') || keyB64.includes('MII') || keyB64.includes('-----'))
      return false;
    return keyB64.length >= 40 && keyB64.length <= 48;
  };

  // Reset unread_count for a given chat/contact id
  // — Now marks messages from the chat as 'read', sets contact.unread_count=0,
  //   and emits markAsRead for each message so server is informed.
  const resetUnreadForChat = useCallback(
    async chatIdToReset => {
      if (!database || !chatIdToReset) return;
      try {
        const contactsCollection = database.collections.get('contacts');
        const messagesCollection = database.collections.get('messages');

        const updatedMsgIds = [];

        // Batch write: update messages then contact in one transaction
        await database.write(async () => {
          // fetch incoming messages from this contact
          // (we fetch by sender_id; depending on your shape you might also want to include chat_id)
          const incoming = await messagesCollection
            .query(Q.where('sender_id', chatIdToReset))
            .fetch();

          for (const m of incoming) {
            const raw = m._raw || {};
            // only update messages that are not already 'read'
            if (raw.status !== 'read') {
              try {
                await m.update(r => {
                  r._raw = {
                    ...r._raw,
                    status: 'read',
                  };
                });
                updatedMsgIds.push(raw.id ?? m.id);
              } catch (e) {
                // ignore single-message update failures
              }
            }
          }

          // update contact unread_count -> 0 (if contact exists)
          const rec = await contactsCollection.find(chatIdToReset).catch(() => null);
          if (rec) {
            try {
              await rec.update(r => {
                r._raw = {
                  ...r._raw,
                  unread_count: 0,
                };
              });
            } catch (e) {
              // ignore contact update failure
            }
          } else {
            // contact missing — nothing to set. Optionally create contact here.
          }
        });

        // Outside DB write: emit markAsRead for each message to inform server
        // (do this after write to avoid race conditions)
        for (const mid of updatedMsgIds) {
          try {
            markAsRead(mid);
          } catch (e) {
            // ignore socket emission errors
          }
        }

        if (updatedMsgIds.length > 0) {
          console.log(
            '[ChatScreen] marked messages read and reset unread_count for',
            chatIdToReset,
          );
        } else {
          // still ensure contact row is cleared if present (in case no messages were updated)
          try {
            const contactsCollection = database.collections.get('contacts');
            const rec2 = await contactsCollection.find(chatIdToReset).catch(() => null);
            if (rec2) {
              await database.write(async () => {
                await rec2.update(r => {
                  r._raw = {
                    ...r._raw,
                    unread_count: 0,
                  };
                });
              });
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.warn('[ChatScreen] failed to reset unread_count', e);
      }
    },
    [database],
  );

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
      // reset unread count for this chat (since we've acknowledged reading)
      try {
        if (chatId) resetUnreadForChat(chatId);
      } catch (e) {
        // ignore
      }
    },
    [markReadLocally, resetUnreadForChat, chatId],
  );

  // helper to lookup contact public key
  const getContactPublicKey = async id => {
    if (!database || !id) return null;
    try {
      const coll = database.collections.get('contacts');
      // try query first (safer than find)
      const rows = await coll.query(Q.where('id', id)).fetch();
      if (Array.isArray(rows) && rows.length > 0) return rows[0]._raw?.public_key ?? null;
      const rec = await coll.find(id).catch(() => null);
      if (rec) return rec._raw?.public_key ?? null;
    } catch (e) {
      // ignore
    }
    return null;
  };

  useEffect(() => {
    const onChatMessage = async msg => {
      if (!msg) return;
      console.log('[ChatScreen] onChatMessage received', msg, 'chatId:', chatId);

      if (msg.from === chatId || msg.sender_id === chatId) {
        // try to decrypt for UI
        let plaintext = null;
        if (msg.ciphertext && privateKey) {
          try {
            // prefer senderPublicKey included in message, else lookup contact
            let senderPub = msg.senderPublicKey ?? msg.sender_public_key ?? msg.publicKey ?? null;
            if (!senderPub) senderPub = await getContactPublicKey(chatId);

            if (senderPub) {
              const dec = decryptMessage({
                recipientSecretKeyB64: privateKey,
                senderPublicKeyB64: senderPub,
                payloadB64: msg.ciphertext,
              });
              if (dec) plaintext = dec;
            }
          } catch (e) {
            console.warn('[ChatScreen] decryption attempt failed for incoming message', e);
          }
        }

        const incoming = {
          id: msg.id,
          type: 'received',
          contentType: 'text',
          text: plaintext ?? msg.content ?? msg.ciphertext ?? '',
          status: msg.status || 'delivered',
          ts: msg.ts ?? new Date().toISOString(),
        };

        setMessages(prev => [...prev, incoming]);

        try {
          if (database) {
            // pass local privateKey to saveIncomingMessage so the DB persister can also decrypt & store plaintext
            await saveIncomingMessage(database, msg, { localPrivateKeyB64: privateKey });
          } else {
            console.warn(
              '[ChatScreen] No database available when trying to save incoming message.',
            );
          }
        } catch (e) {
          console.error('[ChatScreen] saveIncomingMessage failed:', e);
        }

        if (msg.id) emitDelivered(msg.id);
        if (isFocused && msg.id) {
          emitRead(msg.id);
          // ensure unread counter reset when this chat is focused
          try {
            if (database && chatId) {
              await resetUnreadForChat(chatId);
            }
          } catch (e) {
            // ignore
          }
        }
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
  }, [chatId, isFocused, emitDelivered, emitRead, database, privateKey, resetUnreadForChat]);

  useEffect(() => {
    if (!isFocused) return;
    messages
      .filter(m => m.type === 'received' && m.id && !deliveredRef.current.has(m.id))
      .forEach(m => emitDelivered(m.id));

    messages
      .filter(m => m.type === 'received' && m.id && !readRef.current.has(m.id))
      .forEach(m => emitRead(m.id));

    // Reset unread_counter for this chat when screen gets focus
    try {
      if (database && chatId) {
        resetUnreadForChat(chatId);
      }
    } catch (e) {
      // ignore
    }
  }, [
    isFocused,
    messages,
    emitDelivered,
    emitRead,
    database,
    emitRead,
    chatId,
    resetUnreadForChat,
  ]);

  const onMessagesViewed = useCallback(
    visibleIds => {
      if (!visibleIds || visibleIds.length === 0) return;
      for (const id of visibleIds) {
        const msg = messages.find(m => m.id === id);
        if (msg && msg.type === 'received' && !readRef.current.has(id)) {
          emitRead(id);
        }
      }
      // if user scrolled and thus viewed messages, reset unread counter for this chat
      try {
        if (database && chatId) {
          resetUnreadForChat(chatId);
        }
      } catch (e) {
        // ignore
      }
    },
    [messages, emitRead, database, chatId, resetUnreadForChat],
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

    // persist optimistic message locally with tempId (still plaintext in DB)
    try {
      if (database) {
        const coll = database.collections.get('messages');
        const timestampMs = Date.now();
        await database.write(async () => {
          await coll.create(record => {
            record._raw = {
              id: tempId,
              chat_id: chatId ?? '',
              sender_id: 'me',
              content: text, // plaintext stored
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

    // prepare ciphertext (if we have recipient public key & our privateKey)
    let envelope = null;
    try {
      const recipientPub = await getContactPublicKey(chatId);

      // Use NaCl-only encryption if both keys look like NaCl keys; otherwise fallback to cleartext envelope
      if (recipientPub && privateKey && isNaClKey(recipientPub) && isNaClKey(privateKey)) {
        // encrypt using our local secret and recipient public key
        const ciphertext = encryptMessage({
          senderSecretKeyB64: privateKey,
          recipientPublicKeyB64: recipientPub,
          message: text,
        });
        envelope = {
          toUserId: chatId,
          to: chatId,
          ciphertext,
          contentType: 'text',
          senderPublicKey: publicKey ?? null, // include our public key if available
          // nonce is embedded in ciphertext
        };
      } else {
        // fallback: send plaintext in ciphertext field, but include clear flags so server can accept it
        envelope = {
          toUserId: chatId,
          to: chatId,
          ciphertext: text,
          contentType: 'text',
          senderPublicKey: publicKey ?? null,
          cleartext: true,
        };
        if (!recipientPub)
          console.warn('[ChatScreen] recipient public key not found — sending plaintext.');
        if (!privateKey)
          console.warn(
            '[ChatScreen] local privateKey not available or not NaCl — sending plaintext.',
          );
      }
    } catch (e) {
      console.error('[ChatScreen] encryption failed, sending plaintext', e);
      envelope = {
        toUserId: chatId,
        to: chatId,
        ciphertext: text,
        contentType: 'text',
        senderPublicKey: publicKey ?? null,
        cleartext: true,
      };
    }

    // log the final envelope to debug server-side "invalid envelope" responses
    console.log('[ChatScreen] sending envelope:', envelope);

    // send via socket/service
    try {
      const ack = await sendMessage(envelope);

      if (!ack || !ack.id) throw new Error('No ack id from server');

      // update UI: replace tempId with server id and mark status 'sent'
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, id: ack.id, status: 'sent' } : m)),
      );

      // Update DB: create server-id record, then remove temp record (plaintext stored)
      try {
        if (database) {
          const coll = database.collections.get('messages');

          await database.write(async () => {
            await coll.create(record => {
              record._raw = {
                id: ack.id,
                chat_id: chatId ?? '',
                sender_id: 'me',
                content: text, // keep plaintext in DB
                status: 'sent',
                timestamp: Date.now(),
              };
            });

            const tempRecord = await coll.find(tempId).catch(() => null);
            if (tempRecord) {
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
          {/* Replaced outer ScrollView with View to avoid nesting VirtualizedList inside ScrollView */}
          <View style={[styles.messageContainer, { backgroundColor: colors.background }]}>
            <MessageList
              messages={messages}
              onMessagesViewed={onMessagesViewed}
              scrollRef={scrollRef}
            />
          </View>
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
