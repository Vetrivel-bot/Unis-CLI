// src/services/messageService.js

let socket = null;

/**
 * Initializes the message service with the active socket instance.
 * This should be called once in SocketContext after the socket connects.
 * @param {Socket} socketInstance The connected socket.io instance.
 */
export const initMessageService = socketInstance => {
  socket = socketInstance;
  console.log('[MessageService] Initialized.');
};

/**
 * Sends a text message to a user.
 * @param {{toUserId: string, text: string}} messageData
 * @returns {Promise<object>} A promise that resolves with the server acknowledgement object.
 */
export const sendMessage = ({ toUserId, text }) => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      return reject(new Error('Socket not initialized'));
    }
    const envelope = { toUserId, ciphertext: text, nonce: null };
    socket.emit('send_message', envelope, ack => {
      if (ack && ack.status === 'ok' && ack.id) {
        resolve(ack);
      } else {
        reject(ack || new Error('Send message failed: No acknowledgement from server.'));
      }
    });
  });
};

/**
 * Emits a 'message_delivered' event to the server.
 * @param {string} msgId The ID of the message that was delivered.
 */
export const markAsDelivered = msgId => {
  if (!socket || !msgId) return;
  try {
    socket.emit('message_delivered', { msgId });
  } catch (e) {
    console.error('[MessageService] Error emitting message_delivered:', e);
  }
};

/**
 * Emits a 'message_read' event to the server.
 * @param {string} msgId The ID of the message that was read.
 */
export const markAsRead = msgId => {
  if (!socket || !msgId) return;
  try {
    socket.emit('message_read', { msgId });
  } catch (e) {
    console.error('[MessageService] Error emitting message_read:', e);
  }
};
