require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database.config');
const { errorHandler } = require('./middleware/error.middleware');
const { apiLimiter, spinLimiter } = require('./middleware/rateLimit.middleware');
const socketIO = require('./socket/socket');

const app = express();

connectDB();

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/wheel-game-api/auth', require('./routes/auth.routes'));
app.use('/wheel-game-api/wheels', require('./routes/wheel.routes'));

app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: 'Route non trouvée'
    });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

socketIO.init(server);

process.on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION! 💥 Arrêt du serveur...');
    console.error(err.name, err.message);
    process.exit(1);
});

process.on('unhandledRejection', err => {
    console.error('UNHANDLED REJECTION! 💥 Arrêt du serveur...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;