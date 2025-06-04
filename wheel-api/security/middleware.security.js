const Token = require('../security/token.security.js');

const verifyIsAuthenticated = (req, res, next) => {
    console.log('verifying token of the user');
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer")) {
        console.error('mauvais header: ' + header);
        return res.status(401).send({error: "Unauthorized"});
    }
    const jwt = header.split(" ")[1];
    const verifyToken = Token.isTokenValid(jwt);
    if (!verifyToken) {
        return res.status(401).send({error: "Unauthorized"});
    }

    if (verifyToken.origin !== "wheel-api") {
        return res.status(401).send({error: "Unauthorized"});
    }

    next();
};

module.exports = {
    verifyIsAuthenticated
}