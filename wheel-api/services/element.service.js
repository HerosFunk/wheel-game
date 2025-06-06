const Element = require('../models/element.model');
const Wheel = require('../models/wheel.model');

class ElementService {
    async getElementsByWheelId(wheelId) {
        try {
            return await Element.find({ wheel: wheelId });
        } catch (error) {
            throw new Error(`Erreur lors de la récupération des éléments: ${error.message}`);
        }
    }

    async getElementById(id) {
        try {
            const element = await Element.findById(id);
            if (!element) {
                throw new Error('Élément non trouvé');
            }
            return element;
        } catch (error) {
            throw new Error(`Erreur lors de la récupération de l'élément: ${error.message}`);
        }
    }

    async createElement(elementData) {
        try {
            const wheel = await Wheel.findById(elementData.wheel);
            if (!wheel) {
                throw new Error('Roue non trouvée');
            }

            const element = new Element(elementData);
            const savedElement = await element.save();

            await Wheel.findByIdAndUpdate(
                elementData.wheel,
                { $push: { elements: savedElement._id } }
            );

            return savedElement;
        } catch (error) {
            throw new Error(`Erreur lors de la création de l'élément: ${error.message}`);
        }
    }

    async updateElement(id, elementData) {
        try {
            const element = await Element.findByIdAndUpdate(
                id,
                { ...elementData, updatedAt: Date.now() },
                { new: true, runValidators: true }
            );
            if (!element) {
                throw new Error('Élément non trouvé');
            }
            return element;
        } catch (error) {
            throw new Error(`Erreur lors de la mise à jour de l'élément: ${error.message}`);
        }
    }

    async deleteElement(id) {
        try {
            const element = await Element.findById(id);
            if (!element) {
                throw new Error('Élément non trouvé');
            }

            await Wheel.findByIdAndUpdate(
                element.wheel,
                { $pull: { elements: id } }
            );

            await element.deleteOne();

            return { message: 'Élément supprimé avec succès' };
        } catch (error) {
            throw new Error(`Erreur lors de la suppression de l'élément: ${error.message}`);
        }
    }

    async updateElementStatus(id, isActif) {
        try {
            const element = await Element.findByIdAndUpdate(
                id,
                { 
                    isActif,
                    updatedAt: Date.now()
                },
                { new: true, runValidators: true }
            );
            if (!element) {
                throw new Error('Élément non trouvé');
            }
            return element;
        } catch (error) {
            throw new Error(`Erreur lors de la mise à jour du statut de l'élément: ${error.message}`);
        }
    }
}

module.exports = new ElementService(); 