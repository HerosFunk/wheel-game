const Wheel = require('../models/wheel.model');
const Element = require('../models/element.model');
const { AppError } = require('../middleware/error.middleware');

class WheelService {
    async getAllWheels(options = {}) {
        const { sortBy = 'createdAt', sortOrder = 'desc', favoriteOnly = false } = options;
        
        const query = {};
        if (favoriteOnly) {
            query.isFavorite = true;
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const wheels = await Wheel.find(query)
            .sort(sortOptions)
            .populate('elements');

        return wheels;
    }

    async getWheelById(id) {
        try {
            const wheel = await Wheel.findById(id).populate('elements');
            if (!wheel) {
                throw new Error('Roue non trouvée');
            }
            return wheel;
        } catch (error) {
            throw new Error(`Erreur lors de la récupération de la roue: ${error.message}`);
        }
    }

    async createWheel(wheelData) {
        try {
            const wheel = new Wheel(wheelData);
            return await wheel.save();
        } catch (error) {
            throw new Error(`Erreur lors de la création de la roue: ${error.message}`);
        }
    }

    async updateWheel(id, wheelData) {
        try {
            const wheel = await Wheel.findByIdAndUpdate(
                id,
                { ...wheelData, updatedAt: Date.now() },
                { new: true, runValidators: true }
            );
            if (!wheel) {
                throw new Error('Roue non trouvée');
            }
            return wheel;
        } catch (error) {
            throw new Error(`Erreur lors de la mise à jour de la roue: ${error.message}`);
        }
    }

    async deleteWheel(id) {
        try {
            const wheel = await Wheel.findById(id);
            if (!wheel) {
                throw new Error('Roue non trouvée');
            }

            await Element.deleteMany({ wheel: id });
            
            await wheel.deleteOne();
            
            return { message: 'Roue et éléments associés supprimés avec succès' };
        } catch (error) {
            throw new Error(`Erreur lors de la suppression de la roue: ${error.message}`);
        }
    }

    async updateSpinsLeft(id, spinsLeft) {
        try {
            const wheel = await Wheel.findByIdAndUpdate(
                id,
                { 
                    numberOfSpinsLeft: spinsLeft,
                    updatedAt: Date.now()
                },
                { new: true, runValidators: true }
            );
            if (!wheel) {
                throw new Error('Roue non trouvée');
            }
            return wheel;
        } catch (error) {
            throw new Error(`Erreur lors de la mise à jour des spins restants: ${error.message}`);
        }
    }

    async updateSelectedElement(id, selectedElement) {
        try {
            const wheel = await Wheel.findByIdAndUpdate(
                id,
                { 
                    selectedElement,
                    updatedAt: Date.now()
                },
                { new: true, runValidators: true }
            );
            if (!wheel) {
                throw new Error('Roue non trouvée');
            }
            return wheel;
        } catch (error) {
            throw new Error(`Erreur lors de la mise à jour de l'élément sélectionné: ${error.message}`);
        }
    }

    async toggleFavorite(id) {
        const wheel = await Wheel.findById(id);
        if (!wheel) {
            throw new AppError('Roue non trouvée', 404);
        }

        wheel.isFavorite = !wheel.isFavorite;
        await wheel.save();

        return wheel;
    }

    async getFavoriteWheels() {
        return this.getAllWheels({ favoriteOnly: true });
    }
}

module.exports = new WheelService(); 