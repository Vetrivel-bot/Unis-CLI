// src/socket/messageEvents.js
import { AppEventEmitter } from '../services/EventEmitter';
import { saveIncomingMessage } from '../services/messageService';

export const registerMessageEvents = (socket, ctx) => {
  if (!socket) return;

  // ctx should be the object you pass from SocketContext when registering events.
  // Make sure you pass { database } when you call registerMessageEvents.
  const database = ctx?.database ?? null;
  if (!database) {
    console.warn(
      '[messageEvents] No database supplied in ctx — incoming messages WILL still be emitted, but not persisted globally.',
    );
  } else {
    console.log('[messageEvents] Database instance available for global persistence.');
  }

  socket.on('chat_message', async message => {
    console.log('Global [chat_message] received:', message);

    // try to persist globally first (non-blocking for UI but awaited to ensure write)
    if (database) {
      try {
        await saveIncomingMessage(database, message);
        console.log('[messageEvents] message saved to DB:', message.id);
      } catch (err) {
        console.error('[messageEvents] Failed to save incoming message:', err);
      }
    }

    // Emit local event so UI screens and other listeners still get the message
    AppEventEmitter.emit('newMessage', message);
  });

  socket.on('message_status_update', status => {
    console.log('Global [message_status_update] received:', status);
    AppEventEmitter.emit('statusUpdate', status);
  });
};
