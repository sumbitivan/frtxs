/**
 * Скрипт для проверки конфигурации бота
 */

require('dotenv').config();

console.log('🔍 Проверка конфигурации...\n');

const checks = {
    botToken: {
        value: process.env.BOT_TOKEN,
        required: true,
        message: 'Токен бота',
        valid: (val) => val && val.length > 20 && val.includes(':')
    },
    adminId: {
        value: process.env.ADMIN_ID,
        required: false,
        message: 'ID администратора',
        valid: (val) => !val || /^\d+$/.test(val)
    },
    miniAppUrl: {
        value: process.env.MINI_APP_URL,
        required: false,
        message: 'URL Mini App',
        valid: (val) => !val || val.startsWith('http')
    }
};

let hasErrors = false;

for (const [key, check] of Object.entries(checks)) {
    const isValid = check.valid(check.value);
    const isSet = check.value && check.value.trim() !== '';
    
    if (check.required && !isSet) {
        console.log(`❌ ${check.message}: не установлено (обязательно)`);
        hasErrors = true;
    } else if (isSet && !isValid) {
        console.log(`⚠️  ${check.message}: некорректное значение`);
        hasErrors = true;
    } else if (isSet) {
        const displayValue = key === 'botToken' 
            ? `${check.value.substring(0, 10)}...${check.value.substring(check.value.length - 5)}`
            : check.value;
        console.log(`✅ ${check.message}: ${displayValue}`);
    } else {
        console.log(`⚪ ${check.message}: не установлено (опционально)`);
    }
}

console.log('\n');

if (hasErrors) {
    console.log('❌ Обнаружены ошибки в конфигурации!');
    console.log('Проверьте файл .env и исправьте ошибки.\n');
    process.exit(1);
} else {
    console.log('✅ Конфигурация в порядке!\n');
    
    if (!process.env.ADMIN_ID) {
        console.log('💡 Совет: Добавьте ADMIN_ID в .env для получения уведомлений о заявках');
        console.log('   Узнать свой ID можно у бота @userinfobot\n');
    }
    
    if (!process.env.MINI_APP_URL || process.env.MINI_APP_URL.includes('yourdomain.com')) {
        console.log('💡 Совет: Добавьте MINI_APP_URL в .env после развертывания приложения\n');
    }
    
    console.log('🚀 Можно запускать бота: npm start\n');
    process.exit(0);
}
