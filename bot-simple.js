/**
 * Упрощенная версия бота без зависимостей
 * Запуск: node bot-simple.js
 */

const https = require('https');
const http = require('http');

const BOT_TOKEN = '8546224766:AAFGCYcSqnUzoKctSr9pqRWZZIbMSR3djKA';
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const CBR_API_URL = 'https://www.cbr-xml-daily.ru/daily_json.js';
const EXCHANGE_API_URL = 'https://v6.exchangerate-api.com/v6/47637d30dc041e1a0d0c47fb/latest/USD';
const CBR_MARKUP = 0.015; // +1.5%
const REQUESTS_CHAT_ID = process.env.REQUESTS_CHAT_ID || '739191071';

// Кэш курсов
let exchangeRates = {
    buyRate: 95.50,
    sellRate: 96.00,
    lastUpdate: 0
};

// Загрузка курсов валют
function getExchangeRates() {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(CBR_API_URL);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data && data.Valute && data.Valute.USD && data.Valute.USD.Value) {
                        const usdToRub = parseFloat(data.Valute.USD.Value);
                        const adjustedRate = usdToRub * (1 + CBR_MARKUP);
                        exchangeRates.buyRate = adjustedRate.toFixed(2);
                        exchangeRates.sellRate = adjustedRate.toFixed(2);
                        exchangeRates.lastUpdate = Date.now();
                        resolve(exchangeRates);
                    } else {
                        fetchExchangeRateFallback().then(resolve).catch(() => resolve(exchangeRates));
                    }
                } catch (e) {
                    console.error('Ошибка парсинга курсов:', e);
                    fetchExchangeRateFallback().then(resolve).catch(() => resolve(exchangeRates));
                }
            });
        });

        req.on('error', (error) => {
            console.error('Ошибка загрузки курсов:', error);
            fetchExchangeRateFallback().then(resolve).catch(() => resolve(exchangeRates));
        });

        req.end();
    });
}

function fetchExchangeRateFallback() {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(EXCHANGE_API_URL);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const rubRate = data && data.conversion_rates && data.conversion_rates.RUB;
                    if (rubRate) {
                        const usdToRub = parseFloat(rubRate);
                        const adjustedRate = usdToRub * (1 + CBR_MARKUP);
                        exchangeRates.buyRate = adjustedRate.toFixed(2);
                        exchangeRates.sellRate = adjustedRate.toFixed(2);
                        exchangeRates.lastUpdate = Date.now();
                        resolve(exchangeRates);
                    } else {
                        reject(new Error('Fallback rates missing RUB'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
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

        console.log(`Получено сообщение от ${message.from.first_name} (${chatId}): ${text}`);

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
/app - Открыть Mini App
/groupid - Показать ID группы (только в группе)
/id - Показать ваш ID (в личке)`);
        } else if (text === '/rates') {
            getExchangeRates().then(rates => {
                const ratesMessage = `
📊 Текущие курсы валют:

💰 Курс USD/RUB (ЦБ РФ +1.5%): ${rates.buyRate} ₽

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
        } else if (text === '/groupid') {
            if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
                await sendMessage(chatId, `🆔 ID этой группы: ${chatId}`);
            } else {
                await sendMessage(chatId, 'Эта команда работает только в группе.');
            }
        } else if (text === '/id') {
            if (message.chat.type === 'private') {
                await sendMessage(chatId, `🆔 Ваш ID: ${chatId}`);
            } else {
                await sendMessage(chatId, 'Эта команда работает только в личке.');
            }
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
📱 Юзернейм: ${request.clientPhone}
${request.clientComment ? `💬 Комментарий: ${request.clientComment}` : ''}

🕐 Время: ${new Date(request.timestamp).toLocaleString('ru-RU')}`;

                const targetChatId = REQUESTS_CHAT_ID ? REQUESTS_CHAT_ID : chatId;
                await sendMessage(targetChatId, adminMessage);
                await sendMessage(chatId, '✅ Ваша заявка принята! Мы свяжемся с вами в ближайшее время.');
                if (!REQUESTS_CHAT_ID) {
                    console.warn('REQUESTS_CHAT_ID не задан, отправляю в текущий чат.');
                }
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
