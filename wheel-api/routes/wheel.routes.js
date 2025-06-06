const express = require('express');
const router = express.Router();
const wheelController = require('../controllers/wheel.controller');
const authMiddleware = require('../security/middleware.security');
const { validateWheel, validateSpin } = require('../middleware/validation.middleware');

// Routes protégées par authentification
router.use(authMiddleware.verifyIsAuthenticated);

// Routes principales
router.get('/', wheelController.getWheels);
router.post('/', validateWheel, wheelController.createWheel);
router.get('/:id', wheelController.getWheel);
router.put('/:id', validateWheel, wheelController.updateWheel);
router.delete('/:id', wheelController.deleteWheel);

// Routes pour les spins
router.post('/spin/:id', validateSpin, wheelController.spinWheel);

// Routes pour les éléments
router.put('/:wheelId/elements/:elementId/toggle', wheelController.toggleElementActive);
router.put('/:wheelId/elements/set-all-active', wheelController.setAllElementsActive);

// Routes pour les résultats
router.put('/:wheelId/results/reset', wheelController.resetResults);

// Routes pour les favoris
router.put('/:id/favorite', wheelController.toggleFavorite);
router.get('/favorites', wheelController.getFavoriteWheels);

// Route pour cloner une roue
router.post('/clone/:id', wheelController.cloneWheel);

module.exports = router; 