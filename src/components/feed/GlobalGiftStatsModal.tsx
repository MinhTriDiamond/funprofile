import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatNumber } from '@/lib/formatters';
import { Gift, HandHeart } from 'lucide-react';

export type GlobalGiftDirection = 'sent' | 'received';

interface BreakdownRow {
  token_symbol: string | null;
  source: string | null;
  count: number;
  total_amount: number;
  usd_value: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: GlobalGiftDirection;
  totalUsd: number;
}

function formatCompactUsd(n: number): string {
  if (!n || !isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatAmount(n: number): string {
  if (!n) return '0';
  if (n >= 1) return formatNumber(Math.round(n));
  return n.toFixed(6);
}

export const GlobalGiftStatsModal = memo(({ open, onOpenChange, direction, totalUsd }: Props) => {
  const { t } = useLanguage();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['global-gift-breakdown', direction],
    queryFn: async (): Promise<BreakdownRow[]> => {
      const { data, error } = await supabase.rpc('get_global_gift_breakdown', { p_direction: direction });
      if (error) throw error;
      return ((data as unknown) as BreakdownRow[]) || [];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // Aggregate per-token (sum across sources)
  const aggregated = (() => {
    if (!rows) return [] as Array<{ token: string; count: number; amount: number; usd: number }>;
    const map = new Map<string, { token: string; count: number; amount: number; usd: number }>();
    for (const r of rows) {
      const tok = r.token_symbol || 'UNKNOWN';
      const cur = map.get(tok) || { token: tok, count: 0, amount: 0, usd: 0 };
      cur.count += Number(r.count) || 0;
      cur.amount += Number(r.total_amount) || 0;
      cur.usd += Number(r.usd_value) || 0;
      map.set(tok, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.usd - a.usd || b.count - a.count);
  })();

  const Icon = direction === 'sent' ? Gift : HandHeart;
  const title = direction === 'sent' ? t('globalGiftSentTitle') : t('globalGiftReceivedTitle');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{t('globalGiftDisclaimer')}</DialogDescription>
        </DialogHeader>

        <div className="text-center py-4 border-y">
          <div className="text-4xl font-extrabold text-primary tabular-nums">
            {formatCompactUsd(totalUsd)}
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : aggregated.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">—</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">{t('globalGiftBreakdownToken')}</th>
                  <th className="text-right py-2">{t('globalGiftBreakdownCount')}</th>
                  <th className="text-right py-2">{t('globalGiftBreakdownAmount')}</th>
                  <th className="text-right py-2">{t('globalGiftBreakdownUsd')}</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map(r => (
                  <tr key={r.token} className="border-b last:border-0">
                    <td className="py-2 font-semibold">{r.token}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(r.count)}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{formatAmount(r.amount)}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatCompactUsd(r.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

GlobalGiftStatsModal.displayName = 'GlobalGiftStatsModal';
