const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Route pour la vérification du mot de passe et la connexion
router.post('/login', authController.verifyPassword);

// Route pour la déconnexion
router.post('/logout', (req, res) => {
    res.status(200).send({ message: 'Déconnexion réussie' });
});

module.exports = router; 