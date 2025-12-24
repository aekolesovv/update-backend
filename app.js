const bodyParser = require('body-parser');
const { errors } = require('celebrate');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const NotFoundError = require('./errors/NotFoundError');
const errorHandler = require('./middlewares/errorHandler');
const { requestLogger, errorLogger } = require('./middlewares/logger');
const rateLimiter = require('./middlewares/rateLimit');
const mailerRoutes = require('./routes/mailers');
const webhooksRoutes = require('./routes/webhooks');
const swaggerSpec = require('./swagger');

const { PORT = 3001 } = process.env;

const app = express();

app.use('/api/prodamus/webhook', bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));

app.use(bodyParser.json());

app.use(
    cors({
        origin: 'http://localhost:3000',
        credentials: true,
        allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    })
);

const config = {
    JWT_SALT: process.env.JWT_SALT,
};

app.set('config', config);
app.use(requestLogger);
app.use(helmet());
app.use(rateLimiter);

// Swagger документация
app.use('/api/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/crash-test', () => {
    setTimeout(() => {
        throw new Error('Сервер сейчас упадёт');
    }, 0);
});

app.use(mailerRoutes);
app.use('/api', webhooksRoutes);

app.use((req, res, next) => next(new NotFoundError('Страница не найдена')));
app.use(errorLogger);
app.use(errors());
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
