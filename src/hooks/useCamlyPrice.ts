import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CAMLY_FALLBACK_PRICE = 0.000014;
const CACHE_KEY = 'fun_token_prices';
const CACHE_TTL = 60_000; // 60s localStorage cache
const POLL_INTERVAL = 300_000; // 5 minutes

interface CamlyPriceResult {
  price: number;
  change24h: number;
  isLoading: boolean;
}

function readCachedPrices(): { prices: Record<string, { usd: number; usd_24h_change: number }>; fresh: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { prices, ts } = JSON.parse(raw);
    return { prices, fresh: Date.now() - ts < CACHE_TTL };
  } catch {
    return null;
  }
}

function writeCachedPrices(prices: Record<string, { usd: number; usd_24h_change: number }>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ prices, ts: Date.now() }));
  } catch { /* quota exceeded - ignore */ }
}

export const useCamlyPrice = (): CamlyPriceResult => {
  const [price, setPrice] = useState(CAMLY_FALLBACK_PRICE);
  const [change24h, setChange24h] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [failCount, setFailCount] = useState(0);

  const fetchPrice = useCallback(async () => {
    // Check localStorage cache first
    const cached = readCachedPrices();
    if (cached?.fresh && cached.prices.CAMLY) {
      setPrice(cached.prices.CAMLY.usd ?? CAMLY_FALLBACK_PRICE);
      setChange24h(cached.prices.CAMLY.usd_24h_change ?? 0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('token-prices');
      if (error) throw error;
      const prices = data?.prices;
      if (prices) {
        writeCachedPrices(prices);
        const camly = prices.CAMLY;
        if (camly) {
          setPrice(camly.usd ?? CAMLY_FALLBACK_PRICE);
          setChange24h(camly.usd_24h_change ?? 0);
          setFailCount(0);
        }
      }
    } catch {
      setFailCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (failCount >= 3) return;
    fetchPrice();
    const interval = setInterval(fetchPrice, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [failCount, fetchPrice]);

  return { price, change24h, isLoading };
};
