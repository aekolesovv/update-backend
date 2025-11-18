const urlRegex = /^https?:\/\/(www\.)?[a-zA-Z\0-9]+\.[\w\-._~:/?#[\]@!$&'()*+,;=]{2,}#?$/;

const emailRegex = /^[a-z0-9-]+@[a-z0-9-.]+/i;

const allowedCors = [
    'https://my-domain.com',
    'http://my-domain.com',
    'localhost:3000',
    'http://update-you.ru',
];

module.exports = {
    emailRegex,
    urlRegex,
    allowedCors,
};
