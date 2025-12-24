require('dotenv').config();
const nodemailer = require('nodemailer');

const sendPasswordResetEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.MAIL,
            pass: process.env.PASS,
        },
    });

    const resetLink = `https://beancode.ru/reset-password?token=${token}`;
    const mailOptions = {
        from: process.env.MAIL,
        to: email,
        subject: 'Сброс Пароля',
        text: `Перейдите по следующей ссылке для сброса пароля: ${resetLink}`,
    };

    await transporter.sendMail(mailOptions);
};

const sendEmailInfo = async ({ email, subject, text }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.MAIL,
            pass: process.env.PASS,
        },
    });

    const mailOptions = {
        from: email,
        to: process.env.MAIL,
        subject,
        text,
    };

    await transporter.sendMail(mailOptions);
};

const sendOrderDetails = async ({ email, greetings }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.MAIL,
            pass: process.env.PASS,
        },
    });

    // Преобразуем plain text в HTML для лучшей доставляемости
    const htmlGreetings = greetings
        .split('\n')
        .map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '<br>';
            // Форматируем строки с двоеточием как ключ-значение
            if (trimmed.includes(':')) {
                const [key, ...valueParts] = trimmed.split(':');
                const value = valueParts.join(':').trim();
                return `<p><strong>${key}:</strong> ${value}</p>`;
            }
            return `<p>${trimmed}</p>`;
        })
        .join('');

    const mailOptions = {
        from: `"UpdateYou.ru" <${process.env.MAIL}>`,
        to: email,
        replyTo: process.env.MAIL,
        subject: 'Детали заказа',
        text: greetings,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    ${htmlGreetings}
                </div>
            </body>
            </html>
        `,
    };

    await transporter.sendMail(mailOptions);
};

const sendAdminPaymentNotify = async ({ subject, text }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.MAIL,
            pass: process.env.PASS,
        },
    });

    const mailOptions = {
        from: process.env.MAIL,
        to: process.env.MAIL, // ты сам себе
        subject,
        text,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendEmailInfo,
    sendPasswordResetEmail,
    sendOrderDetails,
    sendAdminPaymentNotify,
};
