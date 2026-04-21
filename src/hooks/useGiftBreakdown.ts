import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTokenPrices, FALLBACK_PRICES } from '@/hooks/useTokenPrices';

export interface GiftBreakdownItem {
  token_symbol: string;
  count: number;
  total_amount: number;
  usd_value: number;
}

export interface GiftBreakdownResult {
  items: GiftBreakdownItem[];
  totalUsd: number;
  totalCount: number;
}

export function useGiftBreakdown(userId: string | undefined, direction: 'sent' | 'received') {
  const { data: prices } = useTokenPrices();

  return useQuery<GiftBreakdownResult>({
    queryKey: ['gift-breakdown', userId, direction, !!prices],
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const column = direction === 'sent' ? 'sender_id' : 'recipient_id';
      const { data, error } = await supabase
        .from('donations')
        .select('token_symbol, amount')
        .eq(column, userId!)
        .eq('status', 'confirmed');

      if (error) throw error;

      const map = new Map<string, { count: number; total: number }>();
      for (const row of data || []) {
        const sym = (row.token_symbol || 'UNKNOWN').toUpperCase();
        const amt = parseFloat(String(row.amount || '0')) || 0;
        const cur = map.get(sym) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += amt;
        map.set(sym, cur);
      }

      const priceFor = (sym: string): number => {
        const p = prices?.[sym]?.usd ?? FALLBACK_PRICES[sym]?.usd;
        if (typeof p === 'number') return p;
        // Common aliases
        if (sym === 'WBNB') return prices?.BNB?.usd ?? FALLBACK_PRICES.BNB.usd;
        if (sym === 'BTCB') return prices?.BTC?.usd ?? FALLBACK_PRICES.BTC.usd;
        return 0;
      };

      const items: GiftBreakdownItem[] = Array.from(map.entries()).map(([token_symbol, v]) => ({
        token_symbol,
        count: v.count,
        total_amount: v.total,
        usd_value: v.total * priceFor(token_symbol),
      }));

      items.sort((a, b) => b.usd_value - a.usd_value || b.count - a.count);

      const totalUsd = items.reduce((s, i) => s + i.usd_value, 0);
      const totalCount = items.reduce((s, i) => s + i.count, 0);

      return { items, totalUsd, totalCount };
    },
  });
}
