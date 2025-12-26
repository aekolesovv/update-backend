const mysql = require('mysql2/promise');

const urlRegex = /^https?:\/\/(www\.)?[a-zA-Z\0-9]+\.[\w\-._~:/?#[\]@!$&'()*+,;=]{2,}#?$/;

const emailRegex = /^[a-z0-9-]+@[a-z0-9-.]+/i;

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

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
    pool,
};
