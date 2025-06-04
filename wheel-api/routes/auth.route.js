const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/verify-password', authController.verifyPassword);

module.exports = router;