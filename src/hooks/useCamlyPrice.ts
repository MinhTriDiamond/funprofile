import { useTokenPrices, FALLBACK_PRICES } from './useTokenPrices';

interface CamlyPriceResult {
  price: number;
  change24h: number;
  isLoading: boolean;
}

export const useCamlyPrice = (): CamlyPriceResult => {
  const { data: prices, isLoading } = useTokenPrices();
  const camly = prices?.CAMLY || FALLBACK_PRICES.CAMLY;

  return {
    price: camly.usd,
    change24h: camly.usd_24h_change,
    isLoading,
  };
};
