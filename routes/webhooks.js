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

        // Логируем все заголовки для отладки
        console.log('All headers:', JSON.stringify(req.headers, null, 2));
        console.log('Sign header:', req.headers.sign);
        console.log('Sign header (lowercase):', req.headers.sign);
        console.log('X-Sign header:', req.headers['x-sign']);

        const sign = req.headers.sign || req.headers['X-Sign'] || req.headers['x-sign'];

        // Получаем raw body для проверки подписи (bodyParser.raw сохраняет в req.body как Buffer)
        const raw = req.body ? req.body.toString('utf8') : '';

        console.log('Raw body (first 200 chars):', raw.substring(0, 200));
        console.log('Secret key length:', secret ? secret.length : 0);
        console.log('Secret key (first 10 chars):', secret ? secret.substring(0, 10) : 'NOT SET');

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

        console.log('First 5 pairs:', pairs.slice(0, 5));
        console.log('Last 5 pairs:', pairs.slice(-5));
        console.log('Sorted string length:', sorted.length);
        console.log('Sorted string (first 300 chars):', sorted.substring(0, 300));

        // Пробуем разные варианты формирования подписи
        const hash1 = crypto.createHmac('sha256', secret).update(sorted).digest('hex');

        // Вариант 2: может быть нужно использовать raw body без парсинга (но без sign)?
        const rawWithoutSign = raw.replace(/[&?]sign=[^&]*/, '').replace(/^sign=[^&]*&/, '');
        const hash2 = crypto.createHmac('sha256', secret).update(rawWithoutSign).digest('hex');

        // Вариант 3: может быть нужно декодировать и закодировать заново?
        const decodedPairs = pairs.map(([key, val]) => {
            const decoded = decodeURIComponent(val);
            const reencoded = encodeURIComponent(decoded).replace(/%20/g, '+');
            return [key, reencoded];
        });
        const sortedReencoded = decodedPairs.map(([key, val]) => `${key}=${val}`).join('&');
        const hash3 = crypto.createHmac('sha256', secret).update(sortedReencoded).digest('hex');

        // Для работы с данными парсим raw body с декодированием
        const urlParams = new URLSearchParams(raw);
        const data = Object.fromEntries(urlParams);
        delete data.sign;

        const currentTime = new Date().toISOString();
        console.log(`\n🕐 [${currentTime}] ------ PRODAMUS WEBHOOK ------`);
        console.log('SIGN HEADER:', sign);
        console.log('HASH CALC (variant 1):', hash1);
        console.log('HASH CALC (variant 2 - raw without sign):', hash2);
        console.log('HASH CALC (variant 3 - reencoded):', hash3);
        console.log('STRING   :', sorted);
        console.log('Fields count:', pairs.length);

        // Проверяем все варианты
        const matches1 = hash1 === sign;
        const matches2 = hash2 === sign;
        const matches3 = hash3 === sign;
        console.log('Match variant 1:', matches1);
        console.log('Match variant 2:', matches2);
        console.log('Match variant 3:', matches3);

        if (!matches1 && !matches2 && !matches3) {
            const errorTime = new Date().toISOString();
            console.error(`\n🕐 [${errorTime}] ❌ Invalid signature`);
            console.error('Expected:', sign);
            console.error('Got (variant 1):', hash1);
            console.error('Got (variant 2):', hash2);
            console.error('Got (variant 3):', hash3);
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
