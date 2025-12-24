const crypto = require('crypto');

const express = require('express');
const multer = require('multer');

const { sendOrderDetails, sendAdminPaymentNotify } = require('../models/mailer');
const { logPayment } = require('../utils/paymentLogger');

const router = express.Router();

// Настройка multer для обработки multipart/form-data
const upload = multer();

router.post('/prodamus/webhook', upload.any(), async (req, res) => {
    const startTime = new Date().toISOString();
    console.log(`\n🕐 [${startTime}] PRODAMUS WEBHOOK RECEIVED`);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Files:', req.files);

    try {
        const secret = process.env.PRODAMUS_SECRET;
        const { sign } = req.headers;

        // Получаем все поля из multipart/form-data
        const fields = {};
        req.body = req.body || {};

        // Собираем все поля из req.body (multer уже распарсил multipart)
        Object.keys(req.body).forEach(key => {
            if (key !== 'sign') {
                fields[key] = req.body[key];
            }
        });

        console.log('Fields extracted:', Object.keys(fields));

        // Функция для URL-кодирования в формате application/x-www-form-urlencoded
        // (пробелы как +, как требует Prodamus)
        const urlEncode = str => {
            const stringValue = typeof str !== 'string' ? String(str) : str;
            return encodeURIComponent(stringValue).replace(/%20/g, '+');
        };

        // СОРТИРОВКА КЛЮЧЕЙ и формирование строки для подписи
        const sortedKeys = Object.keys(fields).sort();
        const sorted = sortedKeys
            .map(key => {
                const value = fields[key] || '';
                // URL-encode значение для подписи (пробелы как +)
                const encodedValue = urlEncode(value);
                return `${key}=${encodedValue}`;
            })
            .join('&');

        const hash = crypto.createHmac('sha256', secret).update(sorted).digest('hex');

        // Для работы с данными используем исходные значения
        const data = { ...fields };

        const currentTime = new Date().toISOString();
        console.log(`\n🕐 [${currentTime}] ------ PRODAMUS WEBHOOK ------`);
        console.log('SIGN HEADER:', sign);
        console.log('HASH CALC :', hash);
        console.log('STRING   :', sorted);
        console.log('Fields count:', Object.keys(fields).length);

        if (hash !== sign) {
            const errorTime = new Date().toISOString();
            console.error(`\n🕐 [${errorTime}] ❌ Invalid signature`);
            console.error('Expected:', sign);
            console.error('Got:', hash);
            return res.status(403).json({ error: 'Invalid signature' });
        }

        const successTime = new Date().toISOString();
        console.log(`\n🕐 [${successTime}] ✅ SIGNATURE OK`);

        if (data.payment_status === 'success') {
            logPayment(data);

            const { order_num, sum, customer_email, payment_status_description, date } = data;

            if (customer_email) {
                await sendOrderDetails({
                    email: customer_email,
                    greetings: `
Спасибо за оплату ❤️

Заказ: ${order_num}
Сумма: ${sum} ₽
Дата: ${date}
Статус: ${payment_status_description}
                    `,
                });
            }

            await sendAdminPaymentNotify({
                subject: '💰 Новая оплата updateyou.ru',
                text: `
Заказ: ${order_num}
Сумма: ${sum} ₽
Email: ${customer_email || 'не указан'}
Дата: ${date}
                `,
            });
        }

        const endTime = new Date().toISOString();
        console.log(`🕐 [${endTime}] Webhook processed successfully\n`);
        res.json({ status: 'ok' });
    } catch (e) {
        const errorTime = new Date().toISOString();
        console.error(`\n🕐 [${errorTime}] 🔥 Webhook error:`, e);
        console.error('Stack:', e.stack);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
