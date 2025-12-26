require('dotenv').config();
const { sendPasswordResetEmail } = require('./models/mailer');

// Получаем email из аргументов командной строки или из переменной окружения
const testEmail = 'spear.gas.wing@aboutmy.email';
const testToken = process.argv[3] || 'test-token-12345';

console.log('📧 Отправка тестового письма...');
console.log('Email:', testEmail);
console.log('Token:', testToken);
console.log('');

sendPasswordResetEmail(testEmail, testToken)
    .then(() => {
        console.log('✅ Письмо успешно отправлено!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Ошибка при отправке письма:');
        console.error(error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    });
