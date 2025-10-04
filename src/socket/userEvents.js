export const registerUserEvents = (socket, { setUser }) => {
  if (!socket) return;

  socket.on("user_update", updatedUser => {
    if (updatedUser) {
      setUser(updatedUser);
    }
  });
};
