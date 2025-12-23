const fs = require('fs');
const path = require('path');

const logFilePath = path.join(process.cwd(), 'payments.log');

const logPayment = payment => {
    try {
        // если файла нет — создаём
        if (!fs.existsSync(logFilePath)) {
            fs.writeFileSync(logFilePath, '', 'utf8');
        }

        const logEntry = {
            time: new Date().toISOString(),
            order_id: payment.order_id,
            order_sum: payment.order_sum,
            description: payment.description,
            customer_email: payment.customer_email || null,
            paid: payment.paid,
        };

        fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (error) {
        console.error('❌ Payment log error:', error);
    }
};

module.exports = {
    logPayment,
};
