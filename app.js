// Инициализация Telegram WebApp (с безопасным fallback)
const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : {
    ready: () => {},
    expand: () => {},
    setHeaderColor: () => {},
    setBackgroundColor: () => {},
    initDataUnsafe: {},
    sendData: () => {},
    BackButton: {
        show: () => {},
        hide: () => {},
        onClick: () => {},
        offClick: () => {}
    }
};
tg.ready();
tg.expand();

// Настройка цветов темы Telegram
tg.setHeaderColor('#3390ec');
tg.setBackgroundColor('#f5f5f5');

// Состояние приложения
const state = {
    direction: 'buy', // 'buy' или 'sell'
    buyRate: 95.50,   // Курс покупки USD (рублей за доллар)
    sellRate: 96.00,  // Курс продажи USD (рублей за доллар)
    clientAmount: 0,
    resultAmount: 0
};

// Элементы DOM
const elements = {
    buyRate: document.getElementById('buyRate'),
    sellRate: document.getElementById('sellRate'),
    updateTime: document.getElementById('updateTime'),
    exchangeBtn: document.getElementById('exchangeBtn'),
    exchangeModal: document.getElementById('exchangeModal'),
    closeModal: document.getElementById('closeModal'),
    exchangeForm: document.getElementById('exchangeForm'),
    clientAmount: document.getElementById('clientAmount'),
    clientCurrency: document.getElementById('clientCurrency'),
    resultAmount: document.getElementById('resultAmount'),
    resultCurrency: document.getElementById('resultCurrency'),
    currentRate: document.getElementById('currentRate'),
    rateInfo: document.getElementById('rateInfo'),
    directionBtns: document.querySelectorAll('.direction-btn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setUpdateStatus('Загрузка курса...');
    // Загрузка курсов валют
    loadExchangeRates();
    
    // Обновление курсов каждую минуту
    setInterval(loadExchangeRates, 60000);
    
    // Обработчики событий
    setupEventListeners();
    
    // Отображение начальных курсов
    updateRatesDisplay();
}

// Источник курсов: ЦБ РФ через JSONP (обходит CORS в WebView)
const CBR_JSONP_URL = 'https://www.cbr-xml-daily.ru/daily_jsonp.js';

async function fetchJsonNoCache(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
}

function normalizeRate(value) {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return Number.isFinite(num) ? num : null;
}

function loadCbrJsonp() {
    return new Promise((resolve, reject) => {
        const existing = document.getElementById('cbr-jsonp');
        if (existing) {
            existing.remove();
        }

        const timeoutId = setTimeout(() => {
            reject(new Error('CBR JSONP timeout'));
        }, 8000);

        window.CBR_XML_Daily_Ru = (rates) => {
            clearTimeout(timeoutId);
            resolve(rates);
        };

        const script = document.createElement('script');
        script.id = 'cbr-jsonp';
        script.src = CBR_JSONP_URL;
        script.async = true;
        script.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error('CBR JSONP load failed'));
        };
        document.head.appendChild(script);
    });
}

async function fetchUsdToRub() {
    try {
        const data = await loadCbrJsonp();
        const normalized = normalizeRate(data && data.Valute && data.Valute.USD && data.Valute.USD.Value);
        if (normalized !== null) {
            return { rate: normalized, source: 'cbr' };
        }
    } catch (error) {
        console.warn('CBR JSONP failed.', error);
    }

    throw new Error('CBR JSONP returned invalid data.');
}

// Загрузка курсов валют из API
async function loadExchangeRates() {
    try {
        const rateResult = await fetchUsdToRub();
        const usdToRub = Number(rateResult.rate);
        if (!Number.isFinite(usdToRub)) {
            throw new Error('Invalid rate value');
        }
        
        // Устанавливаем курсы с маржой (покупка немного ниже, продажа немного выше)
        state.buyRate = (usdToRub * 0.995).toFixed(2);  // Покупка USD (отдаем RUB)
        state.sellRate = (usdToRub * 1.005).toFixed(2); // Продажа USD (отдаем USD)
        
        updateRatesDisplay();
        updateTime();
        
        // Если модальное окно открыто, пересчитываем сумму
        if (elements.exchangeModal.classList.contains('active')) {
            calculateResult();
        }
    } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
        // Используем последние известные курсы при ошибке
        updateRatesDisplay();
        setUpdateStatus('Курс недоступен', true);
    }
}

function updateRatesDisplay() {
    if (!elements.buyRate || !elements.sellRate) {
        setUpdateStatus('Ошибка DOM: нет buy/sell', true);
        return;
    }
    const buy = Number.isFinite(Number(state.buyRate)) ? `${state.buyRate} ₽` : '—';
    const sell = Number.isFinite(Number(state.sellRate)) ? `${state.sellRate} ₽` : '—';
    elements.buyRate.textContent = buy;
    elements.sellRate.textContent = sell;
}

function setUpdateStatus(text, isError = false) {
    if (!elements.updateTime) {
        return;
    }
    elements.updateTime.textContent = text;
    elements.updateTime.style.color = isError ? '#ff6b6b' : '';
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    setUpdateStatus(`Курс обновлен: ${timeString}`);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Открытие модального окна
    elements.exchangeBtn.addEventListener('click', () => {
        openModal();
    });
    
    // Закрытие модального окна
    elements.closeModal.addEventListener('click', closeModal);
    elements.exchangeModal.addEventListener('click', (e) => {
        if (e.target === elements.exchangeModal) {
            closeModal();
        }
    });
    
    // Переключение направления обмена
    elements.directionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const direction = btn.dataset.direction;
            setDirection(direction);
        });
    });
    
    // Расчет суммы при вводе
    elements.clientAmount.addEventListener('input', () => {
        calculateResult();
    });
    
    // Отправка формы
    elements.exchangeForm.addEventListener('submit', handleFormSubmit);
}

// Открытие модального окна
function openModal() {
    elements.exchangeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    tg.BackButton.show();
    tg.BackButton.onClick(closeModal);
    
    // Фокус на поле ввода суммы
    setTimeout(() => {
        elements.clientAmount.focus();
    }, 300);
}

// Закрытие модального окна
function closeModal() {
    elements.exchangeModal.classList.remove('active');
    document.body.style.overflow = '';
    tg.BackButton.hide();
    tg.BackButton.offClick(closeModal);
    
    // Сброс формы
    resetForm();
}

// Установка направления обмена
function setDirection(direction) {
    state.direction = direction;
    
    // Обновление активной кнопки
    elements.directionBtns.forEach(btn => {
        if (btn.dataset.direction === direction) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Обновление валют
    if (direction === 'buy') {
        // Покупка USD: отдаем RUB, получаем USD
        elements.clientCurrency.textContent = 'RUB';
        elements.resultCurrency.textContent = 'USD';
    } else {
        // Продажа USD: отдаем USD, получаем RUB
        elements.clientCurrency.textContent = 'USD';
        elements.resultCurrency.textContent = 'RUB';
    }
    
    // Пересчет суммы
    calculateResult();
}

// Расчет итоговой суммы
function calculateResult() {
    const amount = parseFloat(elements.clientAmount.value) || 0;
    state.clientAmount = amount;
    
    if (amount <= 0) {
        updateResultDisplay(0);
        return;
    }
    
    let result = 0;
    let rate = 0;
    
    if (state.direction === 'buy') {
        // Покупка USD: RUB -> USD
        // Если отдаем 1000 RUB, получаем 1000 / курс_покупки USD
        rate = parseFloat(state.buyRate);
        result = amount / rate;
    } else {
        // Продажа USD: USD -> RUB
        // Если отдаем 100 USD, получаем 100 * курс_продажи RUB
        rate = parseFloat(state.sellRate);
        result = amount * rate;
    }
    
    state.resultAmount = result;
    updateResultDisplay(result);
    updateRateInfo(rate);
}

// Обновление отображения результата
function updateResultDisplay(amount) {
    const resultValue = elements.resultAmount.querySelector('.result-value');
    resultValue.textContent = formatAmount(amount);
}

// Обновление информации о курсе
function updateRateInfo(rate) {
    const directionText = state.direction === 'buy' ? 'покупки' : 'продажи';
    const numericRate = Number.isFinite(Number(rate)) ? `${rate} ₽` : '—';
    elements.currentRate.textContent = `${numericRate} (${directionText})`;
}

// Форматирование суммы
function formatAmount(amount) {
    if (amount === 0) return '0.00';
    
    // Для USD показываем 2 знака после запятой
    if (state.direction === 'buy') {
        return amount.toFixed(2);
    }
    // Для RUB показываем 2 знака после запятой
    return amount.toFixed(2);
}

// Обработка отправки формы
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        direction: state.direction,
        clientAmount: state.clientAmount,
        resultAmount: state.resultAmount,
        rate: state.direction === 'buy' ? state.buyRate : state.sellRate,
        clientName: document.getElementById('clientName').value,
        clientPhone: document.getElementById('clientPhone').value,
        clientComment: document.getElementById('clientComment').value,
        timestamp: new Date().toISOString()
    };
    
    // Валидация
    if (!validateForm(formData)) {
        return;
    }
    
    // Отправка данных
    try {
        // Здесь можно отправить данные на сервер
        // await sendToServer(formData);
        
        // Или отправить через Telegram Bot API
        sendToTelegram(formData);
        
        showToast('Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.');
        
        // Закрываем модальное окно через 1.5 секунды
        setTimeout(() => {
            closeModal();
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showToast('Произошла ошибка. Попробуйте еще раз.', 'error');
    }
}

// Валидация формы
function validateForm(data) {
    if (!data.clientName || data.clientName.trim().length < 2) {
        showToast('Введите корректное имя', 'error');
        return false;
    }
    
    if (!data.clientPhone || data.clientPhone.trim().length < 10) {
        showToast('Введите корректный телефон', 'error');
        return false;
    }
    
    if (data.clientAmount <= 0) {
        showToast('Введите сумму больше нуля', 'error');
        return false;
    }
    
    return true;
}

// Отправка данных в Telegram
function sendToTelegram(data) {
    // Получаем данные пользователя из Telegram
    const user = tg.initDataUnsafe?.user;
    
    // Формируем сообщение
    const message = `
🔄 Новая заявка на обмен валюты

📊 Направление: ${data.direction === 'buy' ? 'Покупка USD' : 'Продажа USD'}
💰 Отдает: ${data.clientAmount} ${data.direction === 'buy' ? 'RUB' : 'USD'}
💵 Получает: ${data.resultAmount.toFixed(2)} ${data.direction === 'buy' ? 'USD' : 'RUB'}
📈 Курс: ${data.rate} ₽

👤 Имя: ${data.clientName}
📱 Телефон: ${data.clientPhone}
${data.clientComment ? `💬 Комментарий: ${data.clientComment}` : ''}

${user ? `\n👤 Telegram: @${user.username || user.first_name}` : ''}
🕐 Время: ${new Date().toLocaleString('ru-RU')}
    `.trim();
    
    // Отправляем через Telegram WebApp
    // В реальном приложении здесь должен быть запрос к вашему боту
    tg.sendData(JSON.stringify({
        type: 'exchange_request',
        data: data
    }));
    
    // Также можно показать данные в консоли для отладки
    console.log('Отправка заявки:', message);
}

// Показ toast уведомления
function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    elements.toast.className = 'toast show';
    
    if (type === 'error') {
        elements.toast.style.background = '#ff6b6b';
    } else {
        elements.toast.style.background = '#51cf66';
    }
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// Сброс формы
function resetForm() {
    elements.exchangeForm.reset();
    elements.clientAmount.value = '';
    state.clientAmount = 0;
    state.resultAmount = 0;
    updateResultDisplay(0);
    setDirection('buy');
}

// Обработка кнопки "Назад" в Telegram
tg.BackButton.onClick(() => {
    if (elements.exchangeModal.classList.contains('active')) {
        closeModal();
    }
});
