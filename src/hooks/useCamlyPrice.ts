import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CAMLY_FALLBACK_PRICE = 0.000014;

interface CamlyPriceResult {
  price: number;
  change24h: number;
  isLoading: boolean;
}

export const useCamlyPrice = (): CamlyPriceResult => {
  const [price, setPrice] = useState(CAMLY_FALLBACK_PRICE);
  const [change24h, setChange24h] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [failCount, setFailCount] = useState(0);

  const fetchPrice = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('token-prices');
      if (error) throw error;
      const camly = data?.prices?.CAMLY;
      if (camly) {
        setPrice(camly.usd ?? CAMLY_FALLBACK_PRICE);
        setChange24h(camly.usd_24h_change ?? 0);
        setFailCount(0);
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
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [failCount, fetchPrice]);

  return { price, change24h, isLoading };
};
