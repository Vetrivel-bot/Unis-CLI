// src/socket/messageEvents.js
import { AppEventEmitter } from '../services/EventEmitter';

// The signature (socket, ctx) comes from your registerSocketEvents file.
export const registerMessageEvents = (socket, ctx) => {
  if (!socket) return;

  socket.on('chat_message', message => {
    // Log it globally as before
    console.log('Global [chat_message] received:', message);
    // **Emit a local event that any interested component can subscribe to**
    AppEventEmitter.emit('newMessage', message);
  });

  socket.on('message_status_update', status => {
    // Log it globally as before
    console.log('Global [message_status_update] received:', status);
    // **Emit a local event for status updates**
    AppEventEmitter.emit('statusUpdate', status);
  });
};
