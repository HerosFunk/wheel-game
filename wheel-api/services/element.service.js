const Element = require('../models/element.model');
const Wheel = require('../models/wheel.model');

class ElementService {
    // Récupérer tous les éléments d'une roue
    async getElementsByWheelId(wheelId) {
        try {
            return await Element.find({ wheel: wheelId });
        } catch (error) {
            throw new Error(`Erreur lors de la récupération des éléments: ${error.message}`);
        }
    }

    // Récupérer un élément par son ID
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

    // Créer un nouvel élément
    async createElement(elementData) {
        try {
            // Vérifier que la roue existe
            const wheel = await Wheel.findById(elementData.wheel);
            if (!wheel) {
                throw new Error('Roue non trouvée');
            }

            const element = new Element(elementData);
            const savedElement = await element.save();

            // Mettre à jour la roue avec la référence au nouvel élément
            await Wheel.findByIdAndUpdate(
                elementData.wheel,
                { $push: { elements: savedElement._id } }
            );

            return savedElement;
        } catch (error) {
            throw new Error(`Erreur lors de la création de l'élément: ${error.message}`);
        }
    }

    // Mettre à jour un élément
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

    // Supprimer un élément
    async deleteElement(id) {
        try {
            const element = await Element.findById(id);
            if (!element) {
                throw new Error('Élément non trouvé');
            }

            // Supprimer la référence de l'élément dans la roue
            await Wheel.findByIdAndUpdate(
                element.wheel,
                { $pull: { elements: id } }
            );

            // Supprimer l'élément
            await element.deleteOne();

            return { message: 'Élément supprimé avec succès' };
        } catch (error) {
            throw new Error(`Erreur lors de la suppression de l'élément: ${error.message}`);
        }
    }

    // Mettre à jour le statut actif d'un élément
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