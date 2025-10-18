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
  try {
    registerAuthEvents(socket, ctx);
  } catch (e) {
    console.error('[socketEvents] registerAuthEvents failed:', e);
  }

  try {
    // Ensure messageEvents receives a ctx that includes localPrivateKeyB64 when available.
    // This keeps the calling shape stable while ensuring the message handler has access
    // to the base64 private key (either explicitly provided or coming from ctx.privateKey).
    const messageCtx = {
      ...ctx,
      localPrivateKeyB64: ctx?.localPrivateKeyB64 ?? ctx?.privateKey ?? null,
    };
    registerMessageEvents(socket, messageCtx);
  } catch (e) {
    console.error('[socketEvents] registerMessageEvents failed:', e);
  }

  try {
    registerUserEvents(socket, ctx);
  } catch (e) {
    console.error('[socketEvents] registerUserEvents failed:', e);
  }
};
