const { Server } = require('socket.io');

let io;

const handleWheelEvents = (socket, wheelId) => {
    socket.join(`wheel:${wheelId}`);

    socket.on('wheel:spin', async (data) => {
        try {
            io.to(`wheel:${wheelId}`).emit('wheel:spinning', {
                wheelId,
                timestamp: Date.now()
            });
        } catch (error) {
            socket.emit('error', { message: 'Erreur lors du spin de la roue' });
        }
    });
};

const handleConnection = (socket) => {
    console.log('Nouvelle connexion socket:', socket.id);

    socket.on('error', (error) => {
        console.error('Erreur socket:', error);
        socket.emit('error', { message: 'Une erreur est survenue' });
    });

    socket.on('disconnect', () => {
        console.log('Déconnexion socket:', socket.id);
    });

    socket.on('wheel:join', (wheelId) => {
        handleWheelEvents(socket, wheelId);
        socket.emit('wheel:joined', { wheelId });
    });

    socket.on('wheel:leave', (wheelId) => {
        socket.leave(`wheel:${wheelId}`);
        socket.emit('wheel:left', { wheelId });
    });

};

const init = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    });

    io.use((socket, next) => {
        try {
            next();
        } catch (error) {
            next(new Error('Erreur d\'authentification'));
        }
    });

    io.on('connection', handleConnection);

    console.log('Socket.IO initialisé avec succès!');
    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO non initialisé!');
    }
    return io;
};

const emitToRoom = (room, event, data) => {
    if (!io) {
        throw new Error('Socket.IO non initialisé!');
    }
    io.to(room).emit(event, {
        ...data,
        timestamp: Date.now()
    });
};

const emitToAll = (event, data) => {
    if (!io) {
        throw new Error('Socket.IO non initialisé!');
    }
    io.emit(event, {
        ...data,
        timestamp: Date.now()
    });
};

module.exports = {
    init,
    getIO,
    emitToRoom,
    emitToAll
};
