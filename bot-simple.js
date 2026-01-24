/**
 * Упрощенная версия бота без зависимостей
 * Запуск: node bot-simple.js
 */

const https = require('https');
const http = require('http');

const BOT_TOKEN = '8546224766:AAFGCYcSqnUzoKctSr9pqRWZZIbMSR3djKA';
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const CURRENCY_API_KEY = 'cur_live_VmyyauP81CCSzzsjStHpSHnKkrEJ1bs7zCSi0DUl';
const CURRENCY_API_URL = 'https://api.currencyapi.com/v3/latest';

// Кэш курсов
let exchangeRates = {
    buyRate: 95.50,
    sellRate: 96.00,
    lastUpdate: 0
};

// Загрузка курсов валют
function getExchangeRates() {
    return new Promise((resolve, reject) => {
        const url = `${CURRENCY_API_URL}?base_currency=USD&currencies=RUB&apikey=${CURRENCY_API_KEY}`;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'apikey': CURRENCY_API_KEY
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data.data && data.data.RUB) {
                        const usdToRub = parseFloat(data.data.RUB.value);
                        exchangeRates.buyRate = (usdToRub * 0.995).toFixed(2);  // Покупка USD
                        exchangeRates.sellRate = (usdToRub * 1.005).toFixed(2); // Продажа USD
                        exchangeRates.lastUpdate = Date.now();
                        resolve(exchangeRates);
                    } else {
                        resolve(exchangeRates);
                    }
                } catch (e) {
                    console.error('Ошибка парсинга курсов:', e);
                    resolve(exchangeRates);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Ошибка загрузки курсов:', error);
            resolve(exchangeRates);
        });

        req.end();
    });
}

// Простая функция для отправки запросов к Telegram API
function sendRequest(method, data = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_URL}/${method}`);
        const postData = JSON.stringify(data);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Отправка сообщения
function sendMessage(chatId, text, options = {}) {
    return sendRequest('sendMessage', {
        chat_id: chatId,
        text: text,
        ...options
    });
}

// Получение обновлений (long polling)
let lastUpdateId = 0;

async function getUpdates() {
    try {
        const response = await sendRequest('getUpdates', {
            offset: lastUpdateId + 1,
            timeout: 30
        });

        if (response.ok && response.result) {
            for (const update of response.result) {
                await handleUpdate(update);
                lastUpdateId = update.update_id;
            }
        }
    } catch (error) {
        console.error('Ошибка получения обновлений:', error.message);
    }
}

// Обработка обновлений
async function handleUpdate(update) {
    if (update.message) {
        const message = update.message;
        const chatId = message.chat.id;
        const text = message.text || '';

        console.log(`Получено сообщение от ${message.from.first_name}: ${text}`);

        if (text === '/start' || text === '/start@your_bot_username') {
            const welcomeMessage = `👋 Добро пожаловать в сервис обмена валют!

💱 Мы предлагаем выгодные курсы обмена USD/RUB
⚡ Мгновенные переводы
🔒 Безопасные сделки
💬 Поддержка 24/7

Для работы с Mini App откройте его через кнопку ниже или используйте команду /app`;

            await sendMessage(chatId, welcomeMessage, {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '💱 Обменять валюту',
                            web_app: { url: 'http://localhost:8080/' }
                        }
                    ]]
                }
            });
        } else if (text === '/help') {
            await sendMessage(chatId, `📖 Справка:

/start - Начать работу
/help - Показать справку
/rates - Показать курсы валют
/app - Открыть Mini App`);
        } else if (text === '/rates') {
            getExchangeRates().then(rates => {
                const ratesMessage = `
📊 Текущие курсы валют:

💰 Покупка USD: ${rates.buyRate} ₽
💵 Продажа USD: ${rates.sellRate} ₽

🕐 Обновлено: ${new Date(rates.lastUpdate).toLocaleString('ru-RU')}

Для обмена нажмите кнопку ниже:
                `;

                sendMessage(chatId, ratesMessage, {
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '💱 Обменять валюту',
                                web_app: { url: 'http://localhost:8080/' }
                            }
                        ]]
                    }
                });
            });
        } else if (text === '/app') {
            await sendMessage(chatId, 'Откройте Mini App:', {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '💱 Обменять валюту',
                            web_app: { url: 'http://localhost:8080/' }
                        }
                    ]]
                }
            });
        }
    }

    // Обработка данных из Mini App
    if (update.message && update.message.web_app_data) {
        try {
            const data = JSON.parse(update.message.web_app_data.data);
            console.log('Данные из Mini App:', data);
            
            if (data.type === 'exchange_request') {
                const request = data.data;
                const chatId = update.message.chat.id;
                
                const adminMessage = `🔄 Новая заявка на обмен валюты

📊 Направление: ${request.direction === 'buy' ? 'Покупка USD' : 'Продажа USD'}
💰 Отдает: ${request.clientAmount} ${request.direction === 'buy' ? 'RUB' : 'USD'}
💵 Получает: ${request.resultAmount.toFixed(2)} ${request.direction === 'buy' ? 'USD' : 'RUB'}
📈 Курс: ${request.rate} ₽

👤 Имя: ${request.clientName}
📱 Телефон: ${request.clientPhone}
${request.clientComment ? `💬 Комментарий: ${request.clientComment}` : ''}

🕐 Время: ${new Date(request.timestamp).toLocaleString('ru-RU')}`;

                await sendMessage(chatId, '✅ Ваша заявка принята! Мы свяжемся с вами в ближайшее время.');
                console.log('\n' + adminMessage + '\n');
            }
        } catch (error) {
            console.error('Ошибка обработки данных Mini App:', error);
        }
    }
}

// Загрузка курсов при запуске
getExchangeRates().then(() => {
    console.log('✅ Курсы валют загружены');
    console.log(`💰 Покупка USD: ${exchangeRates.buyRate} ₽`);
    console.log(`💵 Продажа USD: ${exchangeRates.sellRate} ₽`);
});

// Обновление курсов каждые 5 минут
setInterval(() => {
    getExchangeRates().then(() => {
        console.log(`🔄 Курсы обновлены: ${exchangeRates.buyRate} / ${exchangeRates.sellRate}`);
    });
}, 5 * 60 * 1000);

// Запуск бота
console.log('🤖 Бот запущен!');
console.log('📱 Откройте вашего бота в Telegram и отправьте /start');
console.log('🌐 Mini App доступен по адресу: http://localhost:8080/');
console.log('⏹️  Для остановки нажмите Ctrl+C\n');

// Запуск long polling
async function startPolling() {
    while (true) {
        await getUpdates();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

startPolling().catch(console.error);
