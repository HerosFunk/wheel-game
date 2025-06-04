require('dotenv').config();
const Token = require('../security/token.security');

exports.verifyPassword = async (req, res) => {

    const { password } = req.body;

    if (!password) {
        return res.status(400).send({ error: "Missing fields" });
    }

    if (password.toLowerCase() === process.env.PASSWORD_CREATOR) {

        const token = Token.createToken();
        const role = "creator";
        return res.status(200).send({ token: token, role : role });
    }else if (password.toLowerCase() === process.env.PASSWORD_CLIENT) {

        const token = Token.createToken();
        const role = "client";
        return res.status(200).send({ token: token, role : role });

    }else{
        return res.status(401).send({ error: "Unauthorized" });
    }


}
