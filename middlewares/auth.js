// auth.js
const jwt = require('jsonwebtoken');

const { UnauthorizedError } = require('../errors/UnauthorizedError'); // Correct the import path

module.exports = async (req, res, next) => {
    const { authorization } = req.headers;

    // Check if the Authorization header is missing or doesn't start with 'Bearer '
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Authorization token is missing or malformed'));
    }

    const token = authorization.replace('Bearer ', '');
    const { JWT_SALT } = req.app.get('config');

    try {
        const payload = jwt.verify(token, JWT_SALT);
        req.user = payload;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Authorization token has expired'));
        }
        return next(new UnauthorizedError('Invalid authorization token'));
    }
};
