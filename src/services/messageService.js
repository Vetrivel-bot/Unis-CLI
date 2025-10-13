// src/services/messageService.js
import { Q } from '@nozbe/watermelondb';

let socket = null;

export const initMessageService = socketInstance => {
  socket = socketInstance;
  console.log('[MessageService] Initialized.');
};

export const sendMessage = ({ toUserId, text }) => {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not initialized'));
    const envelope = { toUserId, ciphertext: text, nonce: null };
    socket.emit('send_message', envelope, ack => {
      if (ack && ack.status === 'ok' && ack.id) resolve(ack);
      else reject(ack || new Error('Send message failed: No acknowledgement from server.'));
    });
  });
};

export const markAsDelivered = msgId => {
  if (!socket || !msgId) return;
  try {
    socket.emit('message_delivered', { msgId });
  } catch (e) {
    console.error('[MessageService] Error emitting message_delivered:', e);
  }
};

export const markAsRead = msgId => {
  if (!socket || !msgId) return;
  try {
    socket.emit('message_read', { msgId });
  } catch (e) {
    console.error('[MessageService] Error emitting message_read:', e);
  }
};

/**
 * Robust saveIncomingMessage:
 * - Uses find() to check existence (avoids fragile queries on `id`)
 * - Parses timestamp strings or numbers into epoch ms
 * - Writes a full _raw object in the create callback
 */
// src/services/messageService.js
// replace your existing saveIncomingMessage with this

export const saveIncomingMessage = async (database, msg) => {
  if (!database) {
    console.warn('[DB] saveIncomingMessage: no database passed');
    return;
  }
  if (!msg) {
    console.warn('[DB] saveIncomingMessage: no msg provided');
    return;
  }
  if (!msg.id) {
    console.warn('[DB] saveIncomingMessage: msg has no id', msg);
    return;
  }

  const collection = database.collections.get('messages');

  // Normalize timestamp to epoch ms
  let timestampMs = Date.now();
  if (msg.ts) {
    if (typeof msg.ts === 'string') {
      const parsed = Date.parse(msg.ts);
      if (!Number.isNaN(parsed)) timestampMs = parsed;
    } else {
      const asNum = Number(msg.ts);
      if (!Number.isNaN(asNum)) {
        timestampMs = String(asNum).length === 10 ? asNum * 1000 : asNum;
      }
    }
  }

  // Resolve chat_id and sender_id fields defensively
  const chatIdField =
    msg.chat_id ?? msg.conversation_id ?? msg.from ?? msg.to ?? msg.sender_id ?? '';
  const senderIdField = msg.sender_id ?? msg.from ?? '';

  try {
    await database.write(async () => {
      // try to find existing by id (find throws if not found)
      const existing = await collection.find(msg.id).catch(() => null);

      if (existing) {
        // update minimal fields (use _raw to avoid decorator side-effects)
        await existing.update(record => {
          record._raw = {
            ...record._raw,
            content: msg.content ?? msg.ciphertext ?? record._raw.content ?? '',
            status: msg.status ?? record._raw.status ?? 'delivered',
            timestamp: timestampMs,
            chat_id: chatIdField || record._raw.chat_id,
            sender_id: senderIdField || record._raw.sender_id,
          };
        });
        console.log(`[DB] Updated existing message ${msg.id}`);
      } else {
        // create new record with server-provided id
        await collection.create(record => {
          record._raw = {
            id: msg.id,
            chat_id: chatIdField,
            sender_id: senderIdField,
            content: msg.content ?? msg.ciphertext ?? '',
            status: msg.status ?? 'delivered',
            timestamp: timestampMs,
          };
        });
        console.log(`[DB] Created message ${msg.id}`);
      }
    });
  } catch (err) {
    console.error('[DB] saveIncomingMessage ERROR:', err);
  }
};
