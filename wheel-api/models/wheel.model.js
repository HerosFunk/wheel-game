const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.config');

const Wheel = sequelize.define('Wheel', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    removeAfterSelection: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    numberOfSpins: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    numberOfSpinsLeft: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    selectedElement: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = Wheel;