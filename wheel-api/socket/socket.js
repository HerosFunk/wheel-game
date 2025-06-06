const { Server } = require('socket.io');

let io;

// Gestionnaire d'événements pour une roue spécifique
const handleWheelEvents = (socket, wheelId) => {
    // Rejoindre la room de la roue
    socket.join(`wheel:${wheelId}`);

    // Écouter les événements de la roue
    socket.on('wheel:spin', async (data) => {
        try {
            // Émettre l'événement uniquement aux clients dans la room de la roue
            io.to(`wheel:${wheelId}`).emit('wheel:spinning', {
                wheelId,
                timestamp: Date.now()
            });
        } catch (error) {
            socket.emit('error', { message: 'Erreur lors du spin de la roue' });
        }
    });
};

// Gestionnaire de connexion principal
const handleConnection = (socket) => {
    console.log('Nouvelle connexion socket:', socket.id);

    // Gérer les erreurs de socket
    socket.on('error', (error) => {
        console.error('Erreur socket:', error);
        socket.emit('error', { message: 'Une erreur est survenue' });
    });

    // Gérer la déconnexion
    socket.on('disconnect', () => {
        console.log('Déconnexion socket:', socket.id);
    });

    // Écouter les événements de connexion à une roue
    socket.on('wheel:join', (wheelId) => {
        handleWheelEvents(socket, wheelId);
        socket.emit('wheel:joined', { wheelId });
    });

    // Écouter les événements de déconnexion d'une roue
    socket.on('wheel:leave', (wheelId) => {
        socket.leave(`wheel:${wheelId}`);
        socket.emit('wheel:left', { wheelId });
    });

};

// Initialisation du serveur Socket.IO
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

    // Middleware pour la gestion des erreurs
    io.use((socket, next) => {
        try {
            // Ici, tu peux ajouter de l'authentification si nécessaire
            next();
        } catch (error) {
            next(new Error('Erreur d\'authentification'));
        }
    });

    // Gérer les connexions
    io.on('connection', handleConnection);

    console.log('Socket.IO initialisé avec succès!');
    return io;
};

// Obtenir l'instance Socket.IO
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO non initialisé!');
    }
    return io;
};

// Émettre un événement à une room spécifique
const emitToRoom = (room, event, data) => {
    if (!io) {
        throw new Error('Socket.IO non initialisé!');
    }
    io.to(room).emit(event, {
        ...data,
        timestamp: Date.now()
    });
};

// Émettre un événement à tous les clients
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
