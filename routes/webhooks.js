const crypto = require('crypto');

const express = require('express');

const { sendOrderDetails, sendAdminPaymentNotify } = require('../models/mailer');
const { createSale } = require('../models/sales');
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

        // Парсим данные из POST запроса (application/x-www-form-urlencoded)
        const raw = req.body ? req.body.toString('utf8') : '';
        const urlParams = new URLSearchParams(raw);
        const flatData = Object.fromEntries(urlParams);

        // Удаляем sign из данных для проверки подписи
        delete flatData.sign;

        // Функция для преобразования плоского объекта с ключами вида "products[0][name]"
        // в вложенную структуру
        const parseNestedObject = flatObj => {
            const result = {};

            Object.keys(flatObj).forEach(key => {
                // Декодируем ключ
                const decodedKey = decodeURIComponent(key);
                const value = flatData[key];

                // Парсим ключи вида "products[0][name]" или "products[0][price]"
                const arrayMatch = decodedKey.match(/^([^[]+)\[(\d+)\]\[([^\]]+)\]$/);
                if (arrayMatch) {
                    // Формат: products[0][name]
                    const baseKey = arrayMatch[1];
                    const arrayIndex = parseInt(arrayMatch[2], 10);
                    const objectKey = arrayMatch[3];

                    if (!result[baseKey]) {
                        result[baseKey] = [];
                    }
                    if (!result[baseKey][arrayIndex]) {
                        result[baseKey][arrayIndex] = {};
                    }
                    result[baseKey][arrayIndex][objectKey] = value;
                } else {
                    // Обычный ключ без массивов
                    result[decodedKey] = value;
                }
            });

            return result;
        };

        const postData = parseNestedObject(flatData);

        console.log('Post data keys:', Object.keys(postData));
        console.log(
            'Post data (first level):',
            JSON.stringify(postData, null, 2).substring(0, 500)
        );
        console.log('Secret key length:', secret ? secret.length : 0);
        console.log('Secret key (first 10 chars):', secret ? secret.substring(0, 10) : 'NOT SET');

        // Функция для рекурсивной сортировки объекта по ключам
        const sortObjectRecursive = obj => {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(item => sortObjectRecursive(item));
            }

            const sorted = {};
            const keys = Object.keys(obj).sort();

            keys.forEach(key => {
                const value = obj[key];
                // Приводим все значения к строкам согласно документации
                if (value === null || value === undefined) {
                    sorted[key] = '';
                } else if (typeof value === 'object') {
                    sorted[key] = sortObjectRecursive(value);
                } else {
                    sorted[key] = String(value);
                }
            });

            return sorted;
        };

        // Сортируем данные рекурсивно
        const sortedData = sortObjectRecursive(postData);

        // Преобразуем в JSON строку
        let jsonString = JSON.stringify(sortedData);

        // Экранируем / в JSON строке
        jsonString = jsonString.replace(/\//g, '\\/');

        console.log('JSON string (first 500 chars):', jsonString.substring(0, 500));
        console.log('JSON string length:', jsonString.length);

        // Подписываем через HMAC-SHA256
        const hash = crypto.createHmac('sha256', secret).update(jsonString).digest('hex');

        // Для работы с данными используем распарсенные данные
        const data = postData;

        const currentTime = new Date().toISOString();
        console.log(`\n🕐 [${currentTime}] ------ PRODAMUS WEBHOOK ------`);
        console.log('SIGN HEADER:', sign);
        console.log('HASH CALC:', hash);
        console.log('JSON STRING:', jsonString);

        if (hash !== sign) {
            const errorTime = new Date().toISOString();
            console.error(`\n🕐 [${errorTime}] ❌ Invalid signature`);
            console.error('Expected:', sign);
            console.error('Got:', hash);
            console.error('JSON string:', jsonString);
            console.error('\n⚠️  ВОЗМОЖНЫЕ ПРИЧИНЫ:');
            console.error('1. Неправильный секретный ключ (проверьте в настройках Prodamus)');
            console.error('2. Ключ от другой среды (тестовая/продакшн)');
            return res.status(403).json({ error: 'Invalid signature' });
        }

        const successTime = new Date().toISOString();
        console.log(`\n🕐 [${successTime}] ✅ SIGNATURE OK`);

        if (data.payment_status === 'success') {
            logPayment(data);

            const { order_num, sum, customer_email, payment_status_description, date } = data;

            // Сохраняем продажу в БД
            try {
                await createSale({
                    order_num,
                    sum,
                    customer_email,
                    payment_status_description,
                    date,
                });
                console.log(`✅ Sale saved to DB: ${order_num}`);
            } catch (saleError) {
                console.error('❌ Failed to save sale to DB:', saleError.message);
                // Не прерываем выполнение, продолжаем отправку email
            }

            if (customer_email) {
                try {
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
                    console.log(`✅ Email sent to ${customer_email}`);
                } catch (emailError) {
                    console.error(
                        `❌ Failed to send email to ${customer_email}:`,
                        emailError.message
                    );
                    // Не прерываем выполнение, продолжаем отправку уведомления админу
                }
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
