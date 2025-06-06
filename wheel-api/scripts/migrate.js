require('dotenv').config();
const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const Wheel = require('../models/wheel.model');
const Element = require('../models/element.model');

// Configuration PostgreSQL
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT,
    timezone: "UTC"
});

// Configuration MongoDB
const connectMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Fonction pour migrer les données
const migrateData = async () => {
    try {
        // Connexion à MongoDB
        await connectMongoDB();

        // Récupérer toutes les roues de PostgreSQL
        const wheels = await sequelize.query('SELECT * FROM "Wheels"', {
            type: Sequelize.QueryTypes.SELECT
        });

        console.log(`Found ${wheels.length} wheels to migrate`);

        // Pour chaque roue
        for (const wheel of wheels) {
            try {
                // Récupérer les éléments associés
                const elements = await sequelize.query(
                    'SELECT * FROM "Elements" WHERE "wheelId" = :wheelId',
                    {
                        replacements: { wheelId: wheel.id },
                        type: Sequelize.QueryTypes.SELECT
                    }
                );

                // Créer la roue dans MongoDB
                const newWheel = new Wheel({
                    name: wheel.name || 'Sans nom',
                    removeAfterSelection: wheel.removeAfterSelection || false,
                    numberOfSpins: wheel.numberOfSpins || 1,
                    numberOfSpinsLeft: wheel.numberOfSpinsLeft,
                    selectedElement: wheel.selectedElement
                });

                // Sauvegarder la roue pour obtenir son ID
                await newWheel.save();

                // Créer les éléments dans MongoDB
                const elementPromises = elements.map(element => {
                    const newElement = new Element({
                        wheel: newWheel._id,
                        label: element.label || 'Sans nom',
                        isActif: element.isActif !== undefined ? element.isActif : true,
                        weight: element.weight || 1
                    });
                    return newElement.save();
                });

                // Attendre que tous les éléments soient créés
                const savedElements = await Promise.all(elementPromises);

                // Mettre à jour la roue avec les références aux éléments
                newWheel.elements = savedElements.map(element => element._id);
                await newWheel.save();

                console.log(`Migrated wheel "${wheel.name}" with ${elements.length} elements`);
            } catch (error) {
                console.error(`Error migrating wheel ${wheel.id}:`, error);
                // Continue avec la prochaine roue
                continue;
            }
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
};

// Exécuter la migration
migrateData(); 