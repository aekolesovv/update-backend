const crypto = require('crypto');

const express = require('express');
const multer = require('multer');

const { sendOrderDetails, sendAdminPaymentNotify } = require('../models/mailer');
const { logPayment } = require('../utils/paymentLogger');

const router = express.Router();

// Настройка multer для обработки multipart/form-data
const upload = multer();

router.post('/prodamus/webhook', upload.any(), async (req, res) => {
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

        // Функция для URL-кодирования в формате application/x-www-form-urlencoded
        // (пробелы как +, как требует Prodamus)
        const urlEncode = str => {
            if (typeof str !== 'string') {
                str = String(str);
            }
            return encodeURIComponent(str).replace(/%20/g, '+');
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

        console.log('------ PRODAMUS WEBHOOK ------');
        console.log('SIGN HEADER:', sign);
        console.log('HASH CALC :', hash);
        console.log('STRING   :', sorted);

        if (hash !== sign) {
            console.error('❌ Invalid signature');
            return res.status(403).json({ error: 'Invalid signature' });
        }

        console.log('✅ SIGNATURE OK');

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

        res.json({ status: 'ok' });
    } catch (e) {
        console.error('🔥 Webhook error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
