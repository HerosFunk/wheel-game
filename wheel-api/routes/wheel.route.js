const express = require('express');
const router = express.Router();
const wheelController = require('../controllers/wheel.controller');
const authMiddleware = require('../security/middleware.security');

router.post('/', authMiddleware.verifyIsAuthenticated, wheelController.createWheel);

router.get('/:id', authMiddleware.verifyIsAuthenticated, wheelController.getWheel);

router.delete('/:id', authMiddleware.verifyIsAuthenticated, wheelController.deleteWheel);

router.post('/spin/:id', authMiddleware.verifyIsAuthenticated, wheelController.spinWheel);

router.get('/', authMiddleware.verifyIsAuthenticated, wheelController.getUserWheels);

router.post('/clone/:id', authMiddleware.verifyIsAuthenticated, wheelController.cloneWheel);

router.put('/:id', authMiddleware.verifyIsAuthenticated, wheelController.updateWheel);

router.put("/:wheelId/elements/:elementId/toggle", wheelController.toggleElementActive);

router.put("/:wheelId/elements/set-all-active", wheelController.setAllElementsActive);

router.put("/:wheelId/results/reset", wheelController.resetResults);


module.exports = router;
