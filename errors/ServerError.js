const { constants } = require('http2');

const HTTPError = require('./HTTPError');

class ServerError extends HTTPError {
    constructor(message) {
        super(message);
        this.name = 'ServerError';
        this.statusCode = constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
    }
}

module.exports = ServerError;
