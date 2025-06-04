const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const createToken = (type) => {

    return jwt.sign(
        { origin : "wheel-api"},
        JWT_SECRET,
        { expiresIn: '10h' }
    )
};

const isTokenValid = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        console.error("Error verifying", e.message);
        
        return false;
    }
};

module.exports = {
    createToken,
    isTokenValid
};