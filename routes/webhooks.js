// routes/prodamusWebhook.js
const { sendOrderDetails, sendAdminPaymentNotify } = require('../models/mailer');
const { logPayment } = require('../utils/paymentLogger');

const express = require('express');
const crypto = require('crypto');

const router = express.Router();

router.post('/prodamus/webhook', async (req, res) => {
    try {
        const secret = process.env.PRODAMUS_SECRET;
        const sign = req.headers['sign'];

        const body = JSON.stringify(req.body);

        const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');

        if (hash !== sign) {
            console.error('❌ Invalid signature');
            return res.status(403).json({ error: 'Invalid signature' });
        }

        const payment = req.body;

        if (payment.paid === '1') {
            logPayment(payment);

            const { order_id, order_sum, customer_email, description, pay_time } = payment;

            /* -------- письмо клиенту -------- */
            if (customer_email) {
                const clientText = `
Спасибо за оплату ❤️

Тариф: ${description}
Сумма: ${order_sum} ₽
Дата оплаты: ${pay_time}

Добро пожаловать в Update!
                `;

                await sendOrderDetails({
                    email: customer_email,
                    greetings: clientText,
                });
            }

            /* -------- письмо админу -------- */
            const adminText = `
💰 ПРОИЗОШЛА ОПЛАТА

Тариф: ${description}
Сумма: ${order_sum} ₽
Email клиента: ${customer_email || 'не указан'}
Order ID: ${order_id}
Дата оплаты: ${pay_time}
            `;

            await sendAdminPaymentNotify({
                subject: 'Новая оплата на updateyou.ru',
                text: adminText,
            });

            console.log('✅ Оплата обработана:', order_id);
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('🔥 Webhook error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
