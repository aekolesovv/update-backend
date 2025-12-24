const express = require('express');
const crypto = require('crypto');
const { sendOrderDetails, sendAdminPaymentNotify } = require('../models/mailer');
const { logPayment } = require('../utils/paymentLogger');

const router = express.Router();

router.post('/prodamus/webhook', async (req, res) => {
    try {
        const secret = process.env.PRODAMUS_SECRET;
        const sign = req.headers['sign'];
        const rawBody = req.body.toString('utf8');

        const params = Object.fromEntries(new URLSearchParams(rawBody));
        delete params.sign;

        const sortedString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const hash = crypto.createHmac('sha256', secret).update(sortedString).digest('hex');

        console.log('------ PRODAMUS WEBHOOK ------');
        console.log('SIGN HEADER:', sign);
        console.log('HASH CALC :', hash);
        console.log('STRING   :', sortedString);

        if (hash !== sign) {
            console.error('❌ Invalid signature');
            return res.status(403).json({ error: 'Invalid signature' });
        }

        console.log('✅ Signature valid');

        if (params.payment_status === 'success') {
            logPayment(params);

            const { order_num, sum, customer_email, payment_status_description, date } = params;

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
Статус: ${payment_status_description}
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
