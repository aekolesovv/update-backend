class HTTPError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'HTTPError';
    }
}

module.exports = HTTPError;
