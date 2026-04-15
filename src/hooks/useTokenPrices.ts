import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceData {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

const CACHE_KEY = 'fun_token_prices';
const CACHE_TTL = 5 * 60_000; // 5 minutes

const FALLBACK_PRICES: PriceData = {
  BNB: { usd: 700, usd_24h_change: 0 },
  BTCB: { usd: 100000, usd_24h_change: 0 },
  BTC: { usd: 100000, usd_24h_change: 0 },
  USDT: { usd: 1, usd_24h_change: 0 },
  CAMLY: { usd: 0.000014, usd_24h_change: 0 },
  ETH: { usd: 3500, usd_24h_change: 0 },
  POL: { usd: 0.5, usd_24h_change: 0 },
};

function readCache(): PriceData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { prices, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL && prices) return prices;
  } catch { /* ignore */ }
  return null;
}

function writeCache(prices: PriceData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ prices, ts: Date.now() }));
  } catch { /* quota exceeded */ }
}

async function fetchTokenPrices(): Promise<PriceData> {
  // Check localStorage cache first (shared across tabs)
  const cached = readCache();
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('token-prices');
  if (error) throw error;
  const prices: PriceData = data?.prices || FALLBACK_PRICES;
  writeCache(prices);
  return prices;
}

/**
 * Centralized token prices hook using React Query.
 * All components share a single query — no duplicate edge function calls.
 * staleTime = 10 min, refetch interval = 5 min.
 */
export function useTokenPrices() {
  return useQuery<PriceData>({
    queryKey: ['token-prices'],
    queryFn: fetchTokenPrices,
    staleTime: 10 * 60_000, // 10 minutes
    gcTime: 15 * 60_000,
    refetchInterval: 5 * 60_000, // 5 minutes
    refetchIntervalInBackground: false,
    placeholderData: () => readCache() || FALLBACK_PRICES,
    retry: 2,
  });
}

export { FALLBACK_PRICES };
