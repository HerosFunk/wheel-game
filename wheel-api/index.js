const express = require('express');
const cors = require('cors');
const { createServer } = require('node:http');
require('dotenv').config();

const sequelize = require('./config/database.config');

const Wheel = require('./models/wheel.model');
const Element = require('./models/element.model');

async function syncDatabase() {
    try {
        await Wheel.sync();
        await Element.sync();
        await sequelize.sync();
        console.log('Database synchronized successfully.');
    } catch (error) {
        console.error('Error synchronizing database:', error);
    }
}
syncDatabase();

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: "*"/*process.env.URL_FRONT || 'http://localhost:9000*/
}));



const io = require('./socket/socket').init(server);
io.on('connection', (socket) => {
    console.log('a user connected');
});

server.listen(process.env.PORT || 3001, () => {
    console.log(`Server running on port ${process.env.PORT || 3001}`);
});

const authRoutes = require('./routes/auth.route');
const wheelRoutes = require('./routes/wheel.route');

app.use('/auth', authRoutes);
app.use('/wheels', wheelRoutes);

exports.io = io;