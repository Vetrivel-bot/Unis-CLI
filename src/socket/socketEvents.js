// src/socket/socketEvents.js
import { registerAuthEvents } from './authEvents';
import { registerMessageEvents } from './messageEvents';
import { registerUserEvents } from './userEvents';

export const registerSocketEvents = (socket, ctx) => {
  if (!socket) return;

  // Basic connection lifecycle logging (also handled in SocketProvider)
  socket.on('connect', () => {
    console.log('Socket Connected! id=', socket.id);
  });
  socket.on('disconnect', reason => {
    console.log('Socket Disconnected:', reason);
  });

  // domain-specific
  registerAuthEvents(socket, ctx);
  registerMessageEvents(socket, ctx);
  registerUserEvents(socket, ctx);
};
