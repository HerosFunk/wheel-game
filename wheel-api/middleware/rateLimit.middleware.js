const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limite chaque IP à 100 requêtes par fenêtre
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard',
    standardHeaders: true,
    legacyHeaders: false,
});

const spinLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limite chaque IP à 10 spins par minute
    message: 'Trop de spins effectués, veuillez attendre un peu',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    apiLimiter,
    spinLimiter
}; 