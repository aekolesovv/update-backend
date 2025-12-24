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

        const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

        if (hash !== sign) {
            console.log('❌ Invalid signature');
            return res.status(403).json({ error: 'Invalid signature' });
        }

        const payment = Object.fromEntries(new URLSearchParams(rawBody));

        if (payment.paid === '1') {
            logPayment(payment);

            const { order_id, order_sum, customer_email, description, pay_time } = payment;

            if (customer_email) {
                await sendOrderDetails({
                    email: customer_email,
                    greetings: `
Спасибо за оплату ❤️

Тариф: ${description}
Сумма: ${order_sum} ₽
Дата оплаты: ${pay_time}
                    `,
                });
            }

            await sendAdminPaymentNotify({
                subject: 'Новая оплата на updateyou.ru',
                text: `
💰 ПРОИЗОШЛА ОПЛАТА

Тариф: ${description}
Сумма: ${order_sum} ₽
Email клиента: ${customer_email || 'не указан'}
Order ID: ${order_id}
Дата оплаты: ${pay_time}
                `,
            });

            console.log('✅ Оплата обработана:', order_id);
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error('🔥 Webhook error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
