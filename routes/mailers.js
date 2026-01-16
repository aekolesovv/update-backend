const express = require('express');

const { sendEmailInfo } = require('../models/mailer');
const { verifyRecaptcha } = require('../utils/recaptcha');

const router = express.Router();

router.post('/api/send-email', async (req, res) => {
    try {
        const { email, subject, text, recaptchaToken } = req.body;

        // Проверка наличия обязательных полей
        if (!email || !subject || !text) {
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

        await sendEmailInfo({ email, subject, text });
        // await sendOrderDetails({ email, greetings });

        res.json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
