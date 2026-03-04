const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// In-memory cache
let cachedPrices: Record<string, { usd: number; usd_24h_change: number }> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60_000; // 5 minutes (was 60s — too aggressive for CoinGecko free tier)
let backoffUntil = 0; // Don't retry CoinGecko until this timestamp

const COINGECKO_IDS: Record<string, string> = {
  BNB: 'binancecoin',
  BTCB: 'bitcoin',
  USDT: 'tether',
  CAMLY: 'camly-coin',
};

const FALLBACK_PRICES: Record<string, { usd: number; usd_24h_change: number }> = {
  BNB: { usd: 700, usd_24h_change: 0 },
  BTCB: { usd: 100000, usd_24h_change: 0 },
  USDT: { usd: 1, usd_24h_change: 0 },
  CAMLY: { usd: 0.000014, usd_24h_change: 0 },
};

async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        // Rate limited — exponential backoff: 30s, 60s, 120s
        const waitMs = 30_000 * Math.pow(2, i);
        backoffUntil = Date.now() + waitMs;
        console.warn(`[token-prices] Rate limited (429), backing off ${waitMs / 1000}s`);
        if (i < maxRetries) {
          await new Promise(r => setTimeout(r, Math.min(waitMs, 5000))); // Wait max 5s per retry in-request
          continue;
        }
        throw new Error(`CoinGecko rate limited after ${maxRetries + 1} attempts`);
      }
      if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastError!;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();

    // Return cached if fresh
    if (cachedPrices && now - cacheTimestamp < CACHE_TTL) {
      return new Response(JSON.stringify({ prices: cachedPrices, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      });
    }

    // If we're in backoff period, return cached/fallback without hitting CoinGecko
    if (now < backoffUntil) {
      const prices = cachedPrices || FALLBACK_PRICES;
      return new Response(JSON.stringify({ prices, cached: true, backoff: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    // Fetch from CoinGecko with retry
    const ids = Object.values(COINGECKO_IDS).join(',');
    const res = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );

    const data = await res.json();

    const prices: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      const d = data[geckoId];
      prices[symbol] = d
        ? { usd: d.usd ?? FALLBACK_PRICES[symbol].usd, usd_24h_change: d.usd_24h_change ?? 0 }
        : FALLBACK_PRICES[symbol];
    }

    // Update cache
    cachedPrices = prices;
    cacheTimestamp = now;
    backoffUntil = 0; // Reset backoff on success

    return new Response(JSON.stringify({ prices, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (error) {
    console.error('[token-prices] Error:', error);

    // Return cached or fallback
    const prices = cachedPrices || FALLBACK_PRICES;
    return new Response(JSON.stringify({ prices, cached: true, fallback: !cachedPrices }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
