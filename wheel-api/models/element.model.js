const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.config');

const Element = sequelize.define('Element', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    wheelId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    label: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isActif: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1,
            max: 9
        }
    }
});

module.exports = Element;