const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/login', authController.verifyPassword);

router.post('/logout', (req, res) => {
    res.status(200).send({ message: 'Déconnexion réussie' });
});

module.exports = router; 