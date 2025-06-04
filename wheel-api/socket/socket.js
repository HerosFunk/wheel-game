const { Server } = require('socket.io');

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: '*', // Changez '*' par votre URL front si nécessaire
        methods: ['GET', 'POST']
      }
    });
    console.log('Socket.IO initialized!');
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.IO not initialized!');
    }
    return io;
  },
};
