// src/services/messageService.js
import { Q } from '@nozbe/watermelondb';
import { decryptMessage } from '../utils/crypto/chat-crypto'; // adjust path if your chat-crypto location differs

let socket = null;

export const initMessageService = socketInstance => {
  socket = socketInstance;
  console.log('[MessageService] Initialized.');
};

/**
 * sendMessage(envelopeOrArgs)
 *
 * Backwards-compatible: accepts either:
 *  - an envelope object (with ciphertext, toUserId, etc.)
 *  - or the older signature: ({ toUserId, text })
 *
 * The function name is preserved.
 */
export const sendMessage = envelopeOrArgs => {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Socket not initialized'));

    // Build a normalized envelope:
    let envelope = null;
    try {
      // If caller passed an object that already contains a ciphertext field, treat it as the envelope
      if (envelopeOrArgs && typeof envelopeOrArgs === 'object' && 'ciphertext' in envelopeOrArgs) {
        envelope = envelopeOrArgs;
      } else if (envelopeOrArgs && typeof envelopeOrArgs === 'object') {
        // old style: { toUserId, text }
        const { toUserId, text, ...rest } = envelopeOrArgs;
        envelope = { toUserId, ciphertext: text, ...rest };
      } else {
        // fallback (should not happen)
        return reject(new Error('Invalid arguments to sendMessage'));
      }
    } catch (e) {
      return reject(e);
    }

    // debug log the envelope before sending (helps debug "invalid envelope")
    try {
      console.log('[MessageService] emitting send_message envelope:', envelope);
    } catch (e) {
      // ignore logging errors
    }

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
 * - Attempts to decrypt ciphertext using provided localPrivateKeyB64 + sender public key
 *
 * saveIncomingMessage(database, msg, options = {})
 * options: { localPrivateKeyB64 }  // optional: base64 encoded local secret key
 */
export const saveIncomingMessage = async (database, msg, options = {}) => {
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

  // Attempt to decrypt if ciphertext present and we have local private key
  let plaintext = null;
  if (msg.ciphertext && options.localPrivateKeyB64) {
    try {
      // try to obtain senderPublicKey from message or from contacts table
      let senderPub = msg.senderPublicKey ?? msg.sender_public_key ?? msg.publicKey ?? null;

      if (!senderPub && senderIdField) {
        try {
          const contactsCollection = database.collections.get('contacts');
          // try query first (safer than find)
          const maybeContact = await contactsCollection.query(Q.where('id', senderIdField)).fetch();
          if (Array.isArray(maybeContact) && maybeContact.length > 0) {
            senderPub = maybeContact[0]._raw?.public_key ?? senderPub;
          } else {
            const rec = await contactsCollection.find(senderIdField).catch(() => null);
            if (rec) senderPub = rec._raw?.public_key ?? senderPub;
          }
        } catch (e) {
          // ignore lookup failure
        }
      }

      if (senderPub) {
        const dec = decryptMessage({
          recipientSecretKeyB64: options.localPrivateKeyB64,
          senderPublicKeyB64: senderPub,
          payloadB64: msg.ciphertext,
        });
        if (dec) plaintext = dec;
      }
    } catch (e) {
      console.warn('[DB] saveIncomingMessage: decryption attempt failed', e);
    }
  }

  // If decrypt didn't happen or failed, prefer msg.content if present, else fallback to ciphertext (not ideal)
  const contentToStore = plaintext ?? msg.content ?? msg.ciphertext ?? '';

  try {
    await database.write(async () => {
      // try to find existing by id (find throws if not found)
      const existing = await collection.find(msg.id).catch(() => null);

      if (existing) {
        // update minimal fields (use _raw to avoid decorator side-effects)
        await existing.update(record => {
          record._raw = {
            ...record._raw,
            content: contentToStore,
            // keep original status if present, else default
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
            content: contentToStore,
            status: msg.status ?? 'delivered',
            timestamp: timestampMs,
          };
        });
        console.log(`[DB] Created message ${msg.id}`);
      }

      // -------------------------
      // Update unread_count for contact (increment) when appropriate
      // - Only increment for messages that are from someone else (senderIdField present and not 'me')
      // - If message already marked 'read' by server, skip increment
      // -------------------------
      try {
        const isFromOther = !!senderIdField && senderIdField !== 'me';
        const serverSaysRead = msg.status === 'read' || msg.read === true;

        if (isFromOther && !serverSaysRead) {
          try {
            const contactsCollection = database.collections.get('contacts');
            const contactRec = await contactsCollection.find(senderIdField).catch(() => null);
            if (contactRec) {
              const currentUnread = Number(contactRec._raw?.unread_count ?? 0);
              await contactRec.update(r => {
                r._raw = {
                  ...r._raw,
                  unread_count: currentUnread + 1,
                };
              });
              console.log(`[DB] Incremented unread_count for contact ${senderIdField}`);
            } else {
              // contact not found; nothing to update. You may want to create a contact record here if desired.
            }
          } catch (e) {
            // ignore contact update errors
            console.warn('[DB] Failed to increment unread_count for contact', e);
          }
        }
      } catch (e) {
        // ignore
      }
    });
  } catch (err) {
    console.error('[DB] saveIncomingMessage ERROR:', err);
  }
};
