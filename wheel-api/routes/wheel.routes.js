const express = require('express');
const router = express.Router();
const wheelController = require('../controllers/wheel.controller');
const authMiddleware = require('../security/middleware.security');
const { validateWheel, validateSpin } = require('../middleware/validation.middleware');

router.use(authMiddleware.verifyIsAuthenticated);

router.get('/', wheelController.getWheels);
router.post('/', validateWheel, wheelController.createWheel);
router.get('/:id', wheelController.getWheel);
router.put('/:id', validateWheel, wheelController.updateWheel);
router.delete('/:id', wheelController.deleteWheel);

router.post('/spin/:id', validateSpin, wheelController.spinWheel);

router.get('/:id/results', wheelController.getWheelResults);
router.get('/:id/results/recent', wheelController.getRecentResults);
router.get('/:id/results/stats', wheelController.getWheelResults);

router.put('/:wheelId/elements/:elementId/toggle', wheelController.toggleElementActive);
router.put('/:wheelId/elements/set-all-active', wheelController.setAllElementsActive);

router.put('/:wheelId/results/reset', wheelController.resetResults);

router.put('/:id/favorite', wheelController.toggleFavorite);
router.get('/favorites', wheelController.getFavoriteWheels);

router.post('/clone/:id', wheelController.cloneWheel);

module.exports = router; 