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
  unpricedItems: GiftBreakdownItem[];
}

// Tokens không có giá thị trường — hiển thị riêng, không cộng vào tổng USD
const UNPRICED_TOKENS = new Set(['FUN']);

export function useGiftBreakdown(userId: string | undefined, direction: 'sent' | 'received') {
  const { data: prices } = useTokenPrices();

  return useQuery<GiftBreakdownResult>({
    queryKey: ['gift-breakdown-v2', userId, direction, !!prices],
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const map = new Map<string, { count: number; total: number }>();
      const add = (sym: string, amount: number) => {
        const key = (sym || 'UNKNOWN').toUpperCase();
        const amt = Number.isFinite(amount) ? amount : 0;
        const cur = map.get(key) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += amt;
        map.set(key, cur);
      };

      // 1) Donations (cả 2 chiều)
      const donationCol = direction === 'sent' ? 'sender_id' : 'recipient_id';
      const donationsP = supabase
        .from('donations')
        .select('token_symbol, amount')
        .eq(donationCol, userId!)
        .eq('status', 'confirmed')
        .limit(10000);

      // 2) Wallet transfers (chuyển khoản nội bộ) — dùng direction in/out
      const transferDir = direction === 'sent' ? 'out' : 'in';
      const transfersP = supabase
        .from('wallet_transfers')
        .select('token_symbol, amount')
        .eq('user_id', userId!)
        .eq('direction', transferDir)
        .eq('status', 'confirmed')
        .limit(10000);

      // 3) Swaps — chỉ tính ở chiều "sent" (token bán ra)
      const swapsP = direction === 'sent'
        ? supabase
            .from('swap_transactions')
            .select('from_symbol, from_amount')
            .eq('user_id', userId!)
            .eq('status', 'confirmed')
            .limit(10000)
        : Promise.resolve({ data: [] as Array<{ from_symbol: string; from_amount: number }>, error: null });

      const [donationsRes, transfersRes, swapsRes] = await Promise.all([donationsP, transfersP, swapsP]);

      if (donationsRes.error) throw donationsRes.error;
      // wallet_transfers / swap_transactions có thể chưa có RLS cho profile khác — chỉ log, không throw
      if (transfersRes.error && import.meta.env.DEV) {
        console.warn('[useGiftBreakdown] wallet_transfers error:', transfersRes.error);
      }
      if ('error' in swapsRes && swapsRes.error && import.meta.env.DEV) {
        console.warn('[useGiftBreakdown] swap_transactions error:', swapsRes.error);
      }

      for (const row of donationsRes.data || []) {
        add(row.token_symbol || 'UNKNOWN', parseFloat(String(row.amount || '0')) || 0);
      }
      for (const row of transfersRes.data || []) {
        add(row.token_symbol || 'UNKNOWN', parseFloat(String(row.amount || '0')) || 0);
      }
      for (const row of (swapsRes.data || [])) {
        add(row.from_symbol || 'UNKNOWN', parseFloat(String(row.from_amount || '0')) || 0);
      }

      const priceFor = (sym: string): number => {
        const p = prices?.[sym]?.usd ?? FALLBACK_PRICES[sym]?.usd;
        if (typeof p === 'number') return p;
        if (sym === 'WBNB') return prices?.BNB?.usd ?? FALLBACK_PRICES.BNB.usd;
        if (sym === 'BTCB') return prices?.BTC?.usd ?? FALLBACK_PRICES.BTC.usd;
        if (import.meta.env.DEV && !UNPRICED_TOKENS.has(sym)) {
          console.warn(`[useGiftBreakdown] Missing price for token: ${sym}`);
        }
        return 0;
      };

      const allItems: GiftBreakdownItem[] = Array.from(map.entries()).map(([token_symbol, v]) => ({
        token_symbol,
        count: v.count,
        total_amount: v.total,
        usd_value: UNPRICED_TOKENS.has(token_symbol) ? 0 : v.total * priceFor(token_symbol),
      }));

      const items = allItems.filter((i) => !UNPRICED_TOKENS.has(i.token_symbol));
      const unpricedItems = allItems.filter((i) => UNPRICED_TOKENS.has(i.token_symbol));

      items.sort((a, b) => b.usd_value - a.usd_value || b.count - a.count);
      unpricedItems.sort((a, b) => b.total_amount - a.total_amount);

      const totalUsd = items.reduce((s, i) => s + i.usd_value, 0);
      const totalCount = allItems.reduce((s, i) => s + i.count, 0);

      return { items, totalUsd, totalCount, unpricedItems };
    },
  });
}
