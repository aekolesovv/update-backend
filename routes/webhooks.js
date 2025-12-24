const crypto = require('crypto');

const express = require('express');

const { sendOrderDetails, sendAdminPaymentNotify } = require('../models/mailer');
const { logPayment } = require('../utils/paymentLogger');

const router = express.Router();

router.post('/prodamus/webhook', async (req, res) => {
    try {
        const secret = process.env.PRODAMUS_SECRET;
        const { sign } = req.headers;

        const raw = req.body.toString('utf8');

        // Парсим raw body вручную, сохраняя исходные URL-encoded значения
        const parts = raw.split('&');

        const pairs = parts
            .map(part => {
                const equalIndex = part.indexOf('=');
                if (equalIndex === -1) return null;

                const key = part.substring(0, equalIndex);
                const encodedValue = part.substring(equalIndex + 1);

                return key !== 'sign' ? [key, encodedValue] : null;
            })
            .filter(pair => pair !== null);

        // СОРТИРОВКА КЛЮЧЕЙ
        pairs.sort((a, b) => a[0].localeCompare(b[0]));

        // Формируем строку для подписи с исходными URL-encoded значениями
        const sorted = pairs.map(([key, val]) => `${key}=${val}`).join('&');

        const hash = crypto.createHmac('sha256', secret).update(sorted).digest('hex');

        // Для работы с данными используем декодированные значения
        const data = Object.fromEntries(new URLSearchParams(raw));
        delete data.sign;

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
