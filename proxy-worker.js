/**
 * Cloudflare Worker: CBR USD/RUB proxy
 * Deploy this worker and use its URL in the app as PROXY_URL.
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

export default {
  async fetch(request) {
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
          'Cache-Control': 'public, max-age=60'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'rate_unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
