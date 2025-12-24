const express = require('express');
const crypto = require('crypto');
const { sendOrderDetails, sendAdminPaymentNotify } = require('../models/mailer');
const { logPayment } = require('../utils/paymentLogger');

const router = express.Router();

router.post('/prodamus/webhook', async (req, res) => {
    try {
        const secret = process.env.PRODAMUS_SECRET;
        const sign = req.headers['sign'];

        const raw = req.body.toString('utf8');

        // превращаем в объект
        const data = Object.fromEntries(new URLSearchParams(raw));

        // УБИРАЕМ sign если есть
        delete data.sign;

        // СОРТИРОВКА КЛЮЧЕЙ
        const sorted = Object.keys(data)
            .sort()
            .map(key => `${key}=${data[key]}`)
            .join('&');

        const hash = crypto.createHmac('sha256', secret).update(sorted).digest('hex');

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
