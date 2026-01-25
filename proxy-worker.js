/**
 * Cloudflare Worker: CBR USD/RUB proxy + заявки в Telegram
 * Env vars required:
 * - BOT_TOKEN
 * - REQUESTS_CHAT_ID
 */

const CBR_SOURCES = [
  {
    url: 'https://www.cbr-xml-daily.ru/daily_json.js',
    parse: (data) => data && data.Valute && data.Valute.USD && data.Valute.USD.Value
  },
  {
    // Base RUB; USD is inverted
    url: 'https://www.cbr-xml-daily.ru/latest.js',
    parse: (data) => (data && data.rates && data.rates.USD) ? (1 / data.rates.USD) : null
  }
];

async function fetchJson(url) {
  const response = await fetch(url, { cf: { cacheTtl: 60 } });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }
  return response.json();
}

function normalizeRate(value) {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : null;
}

async function getUsdRubRate() {
  for (const source of CBR_SOURCES) {
    const data = await fetchJson(source.url);
    const normalized = normalizeRate(source.parse(data));
    if (normalized !== null) {
      return normalized;
    }
  }
  throw new Error('CBR sources failed');
}

function corsHeaders(methods = 'GET, POST, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

async function sendTelegramMessage(env, text) {
  if (!env || !env.BOT_TOKEN || !env.REQUESTS_CHAT_ID) {
    throw new Error('Telegram env vars missing');
  }
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.REQUESTS_CHAT_ID,
      text
    })
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telegram failed: ${details}`);
  }
}

function formatRequestMessage(payload) {
  const data = payload && payload.data ? payload.data : payload || {};
  const direction = data.direction === 'buy' ? 'Покупка USDT' : 'Продажа USDT';
  const giveCurrency = data.direction === 'buy' ? 'RUB' : 'USDT';
  const getCurrency = data.direction === 'buy' ? 'USDT' : 'RUB';
  const amount = data.clientAmount || '';
  const result = typeof data.resultAmount === 'number'
    ? data.resultAmount.toFixed(2)
    : data.resultAmount || '';
  const rate = data.rate || '';
  const name = data.clientName || '';
  const username = data.clientPhone || '';
  const comment = data.clientComment || '';
  const ts = data.timestamp ? new Date(data.timestamp).toLocaleString('ru-RU') : new Date().toLocaleString('ru-RU');

  return `🔄 Новая заявка на обмен валюты

📊 Направление: ${direction}
💰 Отдает: ${amount} ${giveCurrency}
💵 Получает: ${result} ${getCurrency}
📈 Курс: ${rate} ₽

👤 Имя: ${name}
📱 Юзернейм: ${username}${comment ? `\n💬 Комментарий: ${comment}` : ''}

🕐 Время: ${ts}`;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === 'POST') {
      try {
        const payload = await request.json();
        const message = formatRequestMessage(payload);
        await sendTelegramMessage(env, message);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'request_failed' }), {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
          }
        });
      }
    }

    try {
      const rate = await getUsdRubRate();
      const body = JSON.stringify({
        base: 'USD',
        quote: 'RUB',
        rate,
        source: 'CBR',
        updatedAt: new Date().toISOString()
      });
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
          ...corsHeaders('GET, OPTIONS')
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'rate_unavailable' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders('GET, OPTIONS')
        }
      });
    }
  }
};
