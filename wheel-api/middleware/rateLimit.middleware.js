const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard',
    standardHeaders: true,
    legacyHeaders: false,
});

const spinLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Trop de spins effectués, veuillez attendre un peu',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    apiLimiter,
    spinLimiter
}; 