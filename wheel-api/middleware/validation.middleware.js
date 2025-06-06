const { AppError } = require('./error.middleware');

const validateWheel = (req, res, next) => {
    const { name, numberOfSpins, elements } = req.body;

    if (!name || name.trim().length === 0) {
        return next(new AppError('Le nom de la roue est requis', 400));
    }

    if (numberOfSpins === undefined || numberOfSpins < -1) {
        return next(new AppError('Le nombre de spins doit être -1 (infini) ou un nombre positif', 400));
    }

    if (!elements || !Array.isArray(elements) || elements.length === 0) {
        return next(new AppError('La roue doit contenir au moins un élément', 400));
    }

    // Validation des éléments
    for (const element of elements) {
        if (!element.name || element.name.trim().length === 0) {
            return next(new AppError('Chaque élément doit avoir un nom', 400));
        }
        if (element.weight !== undefined && (element.weight < 1 || element.weight > 9)) {
            return next(new AppError('Le poids de chaque élément doit être entre 1 et 9', 400));
        }
    }

    next();
};

const validateElement = (req, res, next) => {
    const { label, weight } = req.body;

    if (!label || label.trim().length === 0) {
        return next(new AppError('Le label de l\'élément est requis', 400));
    }

    if (weight !== undefined && (weight < 1 || weight > 9)) {
        return next(new AppError('Le poids doit être entre 1 et 9', 400));
    }

    next();
};

const validateSpin = (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        return next(new AppError('ID de la roue requis', 400));
    }
    next();
};

module.exports = {
    validateWheel,
    validateElement,
    validateSpin
}; 