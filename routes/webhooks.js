const crypto = require('crypto');

const express = require('express');

const { sendOrderDetails, sendAdminPaymentNotify } = require('../models/mailer');
const { logPayment } = require('../utils/paymentLogger');

const router = express.Router();

router.post('/prodamus/webhook', async (req, res) => {
    const startTime = new Date().toISOString();
    console.log(`\n🕐 [${startTime}] PRODAMUS WEBHOOK RECEIVED`);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body type:', req.body ? typeof req.body : 'undefined');
    console.log('Body is Buffer:', Buffer.isBuffer(req.body));
    console.log('Raw body length:', req.body ? req.body.length : 0);

    try {
        const secret = process.env.PRODAMUS_SECRET;
        const { sign } = req.headers;

        // Получаем raw body для проверки подписи (bodyParser.raw сохраняет в req.body как Buffer)
        const raw = req.body ? req.body.toString('utf8') : '';

        console.log('Raw body (first 200 chars):', raw.substring(0, 200));

        // Парсим raw body вручную, сохраняя исходные URL-encoded значения
        const parts = raw.split('&');
        const pairs = [];

        parts.forEach(part => {
            const equalIndex = part.indexOf('=');
            if (equalIndex === -1) return;

            const key = part.substring(0, equalIndex);
            const encodedValue = part.substring(equalIndex + 1);

            if (key !== 'sign') {
                pairs.push([key, encodedValue]);
            }
        });

        console.log('Pairs extracted:', pairs.length);

        // СОРТИРОВКА КЛЮЧЕЙ
        pairs.sort((a, b) => a[0].localeCompare(b[0]));

        // Формируем строку для подписи с исходными URL-encoded значениями
        const sorted = pairs.map(([key, val]) => `${key}=${val}`).join('&');

        const hash = crypto.createHmac('sha256', secret).update(sorted).digest('hex');

        // Для работы с данными парсим raw body с декодированием
        const urlParams = new URLSearchParams(raw);
        const data = Object.fromEntries(urlParams);
        delete data.sign;

        const currentTime = new Date().toISOString();
        console.log(`\n🕐 [${currentTime}] ------ PRODAMUS WEBHOOK ------`);
        console.log('SIGN HEADER:', sign);
        console.log('HASH CALC :', hash);
        console.log('STRING   :', sorted);
        console.log('Fields count:', pairs.length);

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
