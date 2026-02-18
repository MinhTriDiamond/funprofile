const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// In-memory cache
let cachedPrices: Record<string, { usd: number; usd_24h_change: number }> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();

    // Return cached if fresh
    if (cachedPrices && now - cacheTimestamp < CACHE_TTL) {
      return new Response(JSON.stringify({ prices: cachedPrices, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    // Fetch from CoinGecko
    const ids = Object.values(COINGECKO_IDS).join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );

    if (!res.ok) {
      throw new Error(`CoinGecko returned ${res.status}`);
    }

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

    return new Response(JSON.stringify({ prices, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
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
