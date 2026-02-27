const { setIO } = require('../utils/taskManager.socketManager');

const initializeSocket = (io) => {
  setIO(io);
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user's personal room for notifications
    socket.on('join-user-room', (userId) => {
      socket.join(userId.toString());
      console.log(`User ${userId} joined their notification room`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = { initializeSocket };

