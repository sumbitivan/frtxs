/**
 * Пример бота для Telegram Mini App - Обмен валют
 * 
 * Установка зависимостей:
 * npm install telegraf dotenv
 * 
 * Создайте файл .env с вашим токеном:
 * BOT_TOKEN=your_bot_token_here
 * ADMIN_ID=your_telegram_user_id
 */

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

// URL вашего Mini App (из .env или по умолчанию)
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://yourdomain.com/';

// Хранилище заявок (в продакшене используйте БД)
const requests = [];

// Команда /start
bot.command('start', (ctx) => {
    const welcomeMessage = `
👋 Добро пожаловать в сервис обмена валют!

💱 Мы предлагаем выгодные курсы обмена USD/RUB
⚡ Мгновенные переводы
🔒 Безопасные сделки
💬 Поддержка 24/7

Нажмите кнопку ниже, чтобы начать обмен:
    `;

    ctx.reply(welcomeMessage, {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: '💱 Обменять валюту',
                    web_app: { url: MINI_APP_URL }
                }
            ]]
        }
    });
});

// Команда /help
bot.command('help', (ctx) => {
    const helpMessage = `
📖 Справка по использованию бота:

/start - Начать работу с ботом
/help - Показать эту справку
/rates - Показать текущие курсы валют
/my_requests - Показать мои заявки

💡 Для обмена валюты используйте кнопку "Обменять валюту"
    `;

    ctx.reply(helpMessage);
});

// Команда /rates
bot.command('rates', async (ctx) => {
    // Здесь можно получить реальные курсы из API
    const buyRate = 95.50;
    const sellRate = 96.00;

    const ratesMessage = `
📊 Текущие курсы валют:

💰 Покупка USD: ${buyRate} ₽
💵 Продажа USD: ${sellRate} ₽

Для обмена нажмите кнопку ниже:
    `;

    ctx.reply(ratesMessage, {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: '💱 Обменять валюту',
                    web_app: { url: MINI_APP_URL }
                }
            ]]
        }
    });
});

// Обработка данных из Mini App
bot.on('web_app_data', async (ctx) => {
    try {
        const data = JSON.parse(ctx.webAppData.data);
        
        if (data.type === 'exchange_request') {
            const request = data.data;
            const userId = ctx.from.id;
            const username = ctx.from.username || ctx.from.first_name;

            // Сохраняем заявку
            const requestId = Date.now().toString();
            const fullRequest = {
                id: requestId,
                userId,
                username,
                ...request,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            
            requests.push(fullRequest);

            // Формируем сообщение для администратора
            const adminMessage = `
🔄 Новая заявка на обмен валюты #${requestId}

📊 Направление: ${request.direction === 'buy' ? 'Покупка USD' : 'Продажа USD'}
💰 Отдает: ${request.clientAmount} ${request.direction === 'buy' ? 'RUB' : 'USD'}
💵 Получает: ${request.resultAmount.toFixed(2)} ${request.direction === 'buy' ? 'USD' : 'RUB'}
📈 Курс: ${request.rate} ₽

👤 Имя: ${request.clientName}
📱 Телефон: ${request.clientPhone}
${request.clientComment ? `💬 Комментарий: ${request.clientComment}` : ''}

👤 Telegram: @${username} (ID: ${userId})
🕐 Время: ${new Date(request.timestamp).toLocaleString('ru-RU')}
            `.trim();

            // Отправляем администратору
            if (ADMIN_ID) {
                await bot.telegram.sendMessage(ADMIN_ID, adminMessage, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '✅ Принять', callback_data: `accept_${requestId}` },
                            { text: '❌ Отклонить', callback_data: `reject_${requestId}` }
                        ]]
                    }
                });
            }

            // Подтверждение пользователю
            await ctx.reply(`
✅ Ваша заявка #${requestId} принята!

📋 Детали заявки:
💰 Отдаете: ${request.clientAmount} ${request.direction === 'buy' ? 'RUB' : 'USD'}
💵 Получите: ${request.resultAmount.toFixed(2)} ${request.direction === 'buy' ? 'USD' : 'RUB'}

⏳ Мы свяжемся с вами в ближайшее время для подтверждения сделки.
            `);

            // Сохраняем заявку пользователю
            await ctx.reply('📝 Вы можете посмотреть все свои заявки командой /my_requests');
        }
    } catch (error) {
        console.error('Ошибка обработки данных из Mini App:', error);
        ctx.reply('❌ Произошла ошибка при обработке заявки. Попробуйте еще раз.');
    }
});

// Обработка callback для администратора
bot.action(/^(accept|reject)_(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    const requestId = ctx.match[2];
    
    // Проверяем, что это администратор
    if (ctx.from.id.toString() !== ADMIN_ID) {
        return ctx.answerCbQuery('❌ У вас нет прав для этого действия');
    }

    const request = requests.find(r => r.id === requestId);
    if (!request) {
        return ctx.answerCbQuery('❌ Заявка не найдена');
    }

    if (action === 'accept') {
        request.status = 'accepted';
        await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n✅ Заявка принята администратором');
        await ctx.answerCbQuery('✅ Заявка принята');
        
        // Уведомляем пользователя
        await bot.telegram.sendMessage(request.userId, `
✅ Ваша заявка #${requestId} принята!

Свяжитесь с нами для завершения сделки.
        `);
    } else {
        request.status = 'rejected';
        await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n❌ Заявка отклонена администратором');
        await ctx.answerCbQuery('❌ Заявка отклонена');
        
        // Уведомляем пользователя
        await bot.telegram.sendMessage(request.userId, `
❌ К сожалению, ваша заявка #${requestId} была отклонена.

Если у вас есть вопросы, свяжитесь с поддержкой.
        `);
    }
});

// Команда для просмотра своих заявок
bot.command('my_requests', (ctx) => {
    const userId = ctx.from.id;
    const userRequests = requests.filter(r => r.userId === userId);

    if (userRequests.length === 0) {
        return ctx.reply('📭 У вас пока нет заявок.\n\nИспользуйте кнопку "Обменять валюту" для создания заявки.');
    }

    let message = '📋 Ваши заявки:\n\n';
    
    userRequests.forEach((req, index) => {
        const statusEmoji = {
            'pending': '⏳',
            'accepted': '✅',
            'rejected': '❌'
        };
        
        const statusText = {
            'pending': 'Ожидает',
            'accepted': 'Принята',
            'rejected': 'Отклонена'
        };

        message += `${index + 1}. Заявка #${req.id} ${statusEmoji[req.status]}\n`;
        message += `   ${req.direction === 'buy' ? 'Покупка' : 'Продажа'} USD\n`;
        message += `   Сумма: ${req.clientAmount} ${req.direction === 'buy' ? 'RUB' : 'USD'}\n`;
        message += `   Статус: ${statusText[req.status]}\n`;
        message += `   Дата: ${new Date(req.createdAt).toLocaleString('ru-RU')}\n\n`;
    });

    ctx.reply(message);
});

// Обработка ошибок
bot.catch((err, ctx) => {
    console.error('Ошибка в боте:', err);
    ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
});

// Запуск бота
bot.launch().then(() => {
    console.log('🤖 Бот запущен!');
}).catch((err) => {
    console.error('Ошибка запуска бота:', err);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
