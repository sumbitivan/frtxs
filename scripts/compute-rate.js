// compute-rate.js
// Читает rate-config.json (там источники + маржа), считает 4 итоговых курса,
// пишет ТОЛЬКО готовые числа в rate.json — без базового курса и без процента маржи.
// Именно rate.json читает статическая аппка на GitHub Pages.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'rate-config.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'rate.json');

function computeFinalRate(baseRate, marginPercent, direction) {
  if (direction === 'down') {
    // клиент продаёт USDT нам — платим ниже рыночного курса на margin_percent
    return baseRate * (1 - marginPercent / 100);
  }
  if (direction === 'up') {
    // клиент покупает USDT у нас — берём выше рыночного курса на margin_percent
    return baseRate * (1 + marginPercent / 100);
  }
  throw new Error(`Неизвестное направление маржи: ${direction}`);
}

async function getBaseRate(entry) {
  if (entry.source === 'manual') {
    if (!entry.manual_rate || entry.manual_rate <= 0) {
      throw new Error(
        `manual_rate не задан или равен 0 — открой rate-config.json и впиши актуальный курс для "${entry.description}"`
      );
    }
    return entry.manual_rate;
  }

  if (entry.source === 'bot') {
    // Заглушка на будущее — когда определишься с конкретным ботом/сервисом,
    // сюда добавляется реальный запрос (fetch к его API, либо парсинг сообщения в Telegram).
    throw new Error(
      `source: "bot" ещё не реализован для "${entry.description}". Переключи на "manual" в rate-config.json, пока не подключишь источник.`
    );
  }

  throw new Error(`Неизвестный source: "${entry.source}"`);
}

async function processDealType(dealTypeName, dealType) {
  const result = {};
  for (const [key, entry] of Object.entries(dealType)) {
    const baseRate = await getBaseRate(entry);
    const finalRate = computeFinalRate(baseRate, entry.margin_percent, entry.margin_direction);
    result[key] = Number(finalRate.toFixed(4));
  }
  return result;
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

    const output = {
    updated_at: new Date().toISOString(),
    cash: await processDealType('cash', config.cash),
    cashless: await processDealType('cashless', config.cashless),
    usd: await processDealType('usd', config.usd),
  };
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log('rate.json обновлён:', output);
}

main().catch((err) => {
  console.error('Ошибка при расчёте курса:', err.message);
  // Важно: скрипт завершается с ошибкой и НЕ перезаписывает rate.json,
  // если что-то пошло не так — старый (валидный) курс останется в репозитории.
  process.exit(1);
});
