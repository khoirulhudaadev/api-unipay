const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
    const token = req.headers['authorization'];

    if (token === undefined) {
        return res.status(403).json({
            status: false,
            message: "You don't have access permissions.",
            token: req.headers
        });
    }

    jwt.verify(token, 'Unipay', function (error) {
        if (error) {
            return res.status(403).json({
                status: false,
                message: error.message,
                token: req.headers
            });
        }

        return next();
    });
};
