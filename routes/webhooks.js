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

        // ВАРИАНТ 1: Сортировка по закодированным ключам, исходные значения
        const pairs1 = [...pairs];
        pairs1.sort((a, b) => a[0].localeCompare(b[0]));
        const sorted1 = pairs1.map(([key, val]) => `${key}=${val}`).join('&');
        const hash1 = crypto.createHmac('sha256', secret).update(sorted1).digest('hex');

        // ВАРИАНТ 2: Декодировать ключи, сортировать, потом закодировать обратно
        const pairs2 = pairs.map(([key, val]) => {
            const decodedKey = decodeURIComponent(key);
            return [decodedKey, val];
        });
        pairs2.sort((a, b) => a[0].localeCompare(b[0]));
        const sorted2 = pairs2
            .map(([key, val]) => {
                const encodedKey = encodeURIComponent(key);
                return `${encodedKey}=${val}`;
            })
            .join('&');
        const hash2 = crypto.createHmac('sha256', secret).update(sorted2).digest('hex');

        // ВАРИАНТ 3: Декодировать и ключи и значения, потом закодировать заново
        const pairs3 = pairs.map(([key, val]) => {
            const decodedKey = decodeURIComponent(key);
            const decodedVal = decodeURIComponent(val);
            const reencodedVal = encodeURIComponent(decodedVal).replace(/%20/g, '+');
            return [decodedKey, reencodedVal];
        });
        pairs3.sort((a, b) => a[0].localeCompare(b[0]));
        const sorted3 = pairs3
            .map(([key, val]) => {
                const encodedKey = encodeURIComponent(key);
                return `${encodedKey}=${val}`;
            })
            .join('&');
        const hash3 = crypto.createHmac('sha256', secret).update(sorted3).digest('hex');

        // ВАРИАНТ 4: Raw body без sign (более точное удаление)
        let rawWithoutSign = raw;
        // Удаляем sign в начале
        if (rawWithoutSign.startsWith('sign=')) {
            const signEnd = rawWithoutSign.indexOf('&');
            if (signEnd !== -1) {
                rawWithoutSign = rawWithoutSign.substring(signEnd + 1);
            } else {
                rawWithoutSign = '';
            }
        }
        // Удаляем sign в середине/конце
        rawWithoutSign = rawWithoutSign.replace(/&sign=[^&]*/, '').replace(/sign=[^&]*&/, '');
        const hash4 = crypto.createHmac('sha256', secret).update(rawWithoutSign).digest('hex');

        // ВАРИАНТ 5: Декодировать ключи для сортировки, но использовать исходные ключи и значения
        const pairs5 = pairs.map(([key, val]) => {
            const decodedKey = decodeURIComponent(key);
            return { originalKey: key, decodedKey, value: val };
        });
        pairs5.sort((a, b) => a.decodedKey.localeCompare(b.decodedKey));
        const sorted5 = pairs5.map(p => `${p.originalKey}=${p.value}`).join('&');
        const hash5 = crypto.createHmac('sha256', secret).update(sorted5).digest('hex');

        console.log('First 5 pairs (variant 1):', pairs1.slice(0, 5));
        console.log('Last 5 pairs (variant 1):', pairs1.slice(-5));
        console.log('Sorted string (variant 1, first 300 chars):', sorted1.substring(0, 300));

        // Для работы с данными парсим raw body с декодированием
        const urlParams = new URLSearchParams(raw);
        const data = Object.fromEntries(urlParams);
        delete data.sign;

        const currentTime = new Date().toISOString();
        console.log(`\n🕐 [${currentTime}] ------ PRODAMUS WEBHOOK ------`);
        console.log('SIGN HEADER:', sign);
        console.log('HASH CALC (variant 1 - encoded keys, original values):', hash1);
        console.log('HASH CALC (variant 2 - decoded keys, reencoded):', hash2);
        console.log('HASH CALC (variant 3 - decoded keys+values, reencoded):', hash3);
        console.log('HASH CALC (variant 4 - raw without sign):', hash4);
        console.log('HASH CALC (variant 5 - decoded keys for sort, original keys+values):', hash5);
        console.log('Fields count:', pairs.length);

        // Проверяем все варианты
        const matches1 = hash1 === sign;
        const matches2 = hash2 === sign;
        const matches3 = hash3 === sign;
        const matches4 = hash4 === sign;
        const matches5 = hash5 === sign;
        console.log('Match variant 1:', matches1);
        console.log('Match variant 2:', matches2);
        console.log('Match variant 3:', matches3);
        console.log('Match variant 4:', matches4);
        console.log('Match variant 5:', matches5);

        if (!matches1 && !matches2 && !matches3 && !matches4 && !matches5) {
            const errorTime = new Date().toISOString();
            console.error(`\n🕐 [${errorTime}] ❌ Invalid signature`);
            console.error('Expected:', sign);
            console.error('Got (variant 1):', hash1);
            console.error('Got (variant 2):', hash2);
            console.error('Got (variant 3):', hash3);
            console.error('Got (variant 4):', hash4);
            console.error('Got (variant 5):', hash5);
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
