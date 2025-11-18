const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Update Backend API',
            version: '1.0.0',
            description: 'API для системы Update',
            contact: {
                name: 'Timurito',
                url: 'https://github.com/timuritodev/vsebox-api',
            },
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Локальный сервер разработки',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./docs/swagger/*.js'], // Пути к файлам с аннотациями
};

const specs = swaggerJsdoc(options);

module.exports = specs;
