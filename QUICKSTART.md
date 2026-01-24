# 🚀 Быстрый старт

## Шаг 1: Установка зависимостей

```bash
cd crypto-exchange-miniapp
npm install
```

## Шаг 2: Настройка бота

Токен бота уже добавлен в файл `.env`. 

Теперь нужно:
1. Узнать свой Telegram User ID (отправьте `/start` боту [@userinfobot](https://t.me/userinfobot))
2. Добавить ваш ID в файл `.env` в поле `ADMIN_ID`

## Шаг 3: Развертывание Mini App

### Вариант 1: GitHub Pages (бесплатно)

1. Создайте репозиторий на GitHub
2. Загрузите файлы `index.html`, `styles.css`, `app.js`
3. Включите GitHub Pages в настройках репозитория
4. Скопируйте URL (например: `https://username.github.io/repository-name/`)
5. Добавьте этот URL в `.env` в поле `MINI_APP_URL`

### Вариант 2: Netlify (бесплатно)

1. Зарегистрируйтесь на [netlify.com](https://netlify.com)
2. Перетащите папку с файлами в Netlify
3. Скопируйте полученный URL
4. Добавьте этот URL в `.env` в поле `MINI_APP_URL`

### Вариант 3: Vercel (бесплатно)

1. Зарегистрируйтесь на [vercel.com](https://vercel.com)
2. Импортируйте проект
3. Скопируйте полученный URL
4. Добавьте этот URL в `.env` в поле `MINI_APP_URL`

## Шаг 4: Настройка Mini App в BotFather

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newapp`
3. Выберите вашего бота
4. Следуйте инструкциям:
   - Название: `Обмен валют`
   - Описание: `Сервис обмена USD/RUB`
   - Иконка: загрузите изображение 512x512px
   - URL: вставьте URL из шага 3

## Шаг 5: Запуск бота

```bash
npm start
```

Или для разработки с автоперезагрузкой:

```bash
npm run dev
```

## Шаг 6: Тестирование

1. Откройте вашего бота в Telegram
2. Отправьте команду `/start`
3. Нажмите кнопку "💱 Обменять валюту"
4. Mini App должно открыться

## 🔧 Настройка курсов валют

По умолчанию используются тестовые курсы. Для получения реальных курсов:

1. Замените функцию `loadExchangeRates()` в `app.js`
2. Добавьте запрос к API курсов валют (например, ЦБ РФ, или ваш собственный API)

Пример:

```javascript
async function loadExchangeRates() {
    try {
        // Пример с API ЦБ РФ
        const response = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
        const data = await response.json();
        
        // USD курс
        const usdRate = data.Valute.USD.Value;
        
        // Устанавливаем курсы с небольшой маржой
        state.buyRate = (usdRate * 0.995).toFixed(2);  // Покупка (немного ниже)
        state.sellRate = (usdRate * 1.005).toFixed(2); // Продажа (немного выше)
        
        updateRatesDisplay();
        updateTime();
    } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
    }
}
```

## 📝 Важные замечания

- ⚠️ **Безопасность**: Не публикуйте файл `.env` в публичных репозиториях
- 🔒 **HTTPS**: Mini App должен работать только по HTTPS
- 📱 **Тестирование**: Используйте `test.html` для тестирования в браузере

## 🆘 Проблемы?

- Бот не отвечает: проверьте токен в `.env`
- Mini App не открывается: проверьте URL в BotFather и `.env`
- Ошибки при запуске: убедитесь, что установлены все зависимости (`npm install`)
