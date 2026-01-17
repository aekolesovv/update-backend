const express = require('express');

const { sendEmailInfo } = require('../models/mailer');
const { verifyRecaptcha } = require('../utils/recaptcha');

const router = express.Router();

router.post('/api/send-email', async(req, res) => {
    try {
        const { email, subject, text, recaptchaToken } = req.body;

        // Логирование для отладки
        console.log('Received request body:', { email, subject, text: text ? text.substring(0, 50) : null, recaptchaToken: recaptchaToken ? 'present' : 'missing' });

        // Проверка наличия обязательных полей
        // email может быть пустым (""), если контакт в text (например, telegram/phone)
        // subject и text обязательны
        if (!subject || !text || (typeof text !== 'string' || text.trim() === '')) {
            console.error('Missing required fields:', { email: email || '(empty)', subject: !!subject, text: !!text });
            return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
        }

        // Проверка reCAPTCHA
        if (!recaptchaToken) {
            return res.status(400).json({ error: 'Токен reCAPTCHA отсутствует' });
        }

        const recaptchaResult = await verifyRecaptcha(recaptchaToken);
        if (!recaptchaResult.success) {
            return res.status(400).json({ error: recaptchaResult.error || 'Ошибка проверки reCAPTCHA' });
        }

        // Для reCAPTCHA v3 проверяем score (рекомендуется минимум 0.5)
        // v2 не возвращает score, поэтому проверяем только если он есть
        if (recaptchaResult.score !== undefined && recaptchaResult.score < 0.5) {
            console.warn(`reCAPTCHA v3 низкий score: ${recaptchaResult.score}`);
            // Можно либо заблокировать, либо только предупредить в логах
            // return res.status(400).json({ error: 'Подозрительная активность. Попробуйте еще раз.' });
        }

        await sendEmailInfo({ email, subject, text });
        // await sendOrderDetails({ email, greetings });

        res.json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;