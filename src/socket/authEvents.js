// src/socket/authEvents.js
export const registerAuthEvents = (socket, { setAccessToken, setRefreshToken }) => {
  if (!socket) return;

  socket.on('tokens', async payload => {
    try {
      const { accessToken: newAccess, refreshToken: newRefresh } = payload || {};
      if (newAccess) await setAccessToken(newAccess);
      if (newRefresh) await setRefreshToken(newRefresh);
      console.log('Saved new tokens from socket payload');
    } catch (e) {
      console.error('Error saving tokens from socket:', e);
    }
  });

  socket.on('connect_error', error => {
    console.error('Socket Connection Error:', error?.message ?? error);
  });
};
