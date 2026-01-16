const https = require('https');
const querystring = require('querystring');

/**
 * Проверяет токен reCAPTCHA через Google API
 * @param {string} token - Токен reCAPTCHA от клиента
 * @returns {Promise<{success: boolean, score?: number, error?: string}>}
 */
const verifyRecaptcha = async (token) => {
    if (!token) {
        return { success: false, error: 'Токен reCAPTCHA отсутствует' };
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        console.error('RECAPTCHA_SECRET_KEY не установлен в .env');
        return { success: false, error: 'Ошибка конфигурации сервера' };
    }
    
    // Логирование для отладки (первые 10 символов ключа)
    console.log('Using reCAPTCHA Secret Key:', secretKey.substring(0, 10) + '...');

    const postData = querystring.stringify({
        secret: secretKey,
        response: token,
    });

    const options = {
        hostname: 'www.google.com',
        path: '/recaptcha/api/siteverify',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
        },
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('reCAPTCHA verification result:', JSON.stringify(result, null, 2));
                    
                    if (result.success) {
                        resolve({
                            success: true,
                            score: result.score, // Для reCAPTCHA v3
                        });
                    } else {
                        const errorCodes = result['error-codes'] || [];
                        let errorMessage = 'Ошибка проверки reCAPTCHA';
                        
                        // Более понятные сообщения об ошибках
                        if (errorCodes.includes('invalid-input-secret')) {
                            errorMessage = 'Неверный секретный ключ reCAPTCHA. Проверьте RECAPTCHA_SECRET_KEY в .env';
                        } else if (errorCodes.includes('invalid-input-response')) {
                            errorMessage = 'Неверный токен reCAPTCHA. Возможно, токен истек или недействителен';
                        } else if (errorCodes.includes('timeout-or-duplicate')) {
                            errorMessage = 'Токен reCAPTCHA истек или уже использован';
                        } else if (errorCodes.length > 0) {
                            errorMessage = `Ошибка reCAPTCHA: ${errorCodes.join(', ')}`;
                        }
                        
                        resolve({
                            success: false,
                            error: errorMessage,
                        });
                    }
                } catch (error) {
                    console.error('Ошибка парсинга ответа reCAPTCHA:', error);
                    console.error('Raw response:', data);
                    resolve({
                        success: false,
                        error: 'Ошибка обработки ответа от reCAPTCHA',
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error('Ошибка запроса к reCAPTCHA API:', error);
            resolve({
                success: false,
                error: 'Ошибка соединения с сервисом reCAPTCHA',
            });
        });

        req.write(postData);
        req.end();
    });
};

module.exports = { verifyRecaptcha };
