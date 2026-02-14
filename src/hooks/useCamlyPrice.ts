import { useState, useEffect, useCallback } from 'react';

const CAMLY_FALLBACK_PRICE = 0.000014;
const COINGECKO_ID = 'camly-coin';

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
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_ID}&vs_currencies=usd&include_24hr_change=true`
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const camly = data[COINGECKO_ID];
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
