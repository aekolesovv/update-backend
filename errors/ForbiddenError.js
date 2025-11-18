const { constants } = require('http2');

const HTTPError = require('./HTTPError');

class ForbiddenError extends HTTPError {
    constructor(message) {
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = constants.HTTP_STATUS_FORBIDDEN;
    }
}

module.exports = ForbiddenError;
