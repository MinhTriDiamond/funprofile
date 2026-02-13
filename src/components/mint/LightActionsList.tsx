import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, Clock, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LightActionCard } from './LightActionCard';
import { usePendingActions } from '@/hooks/usePendingActions';

interface AllAction {
  id: string;
  action_type: string;
  content_preview: string | null;
  mint_amount: number | null;
  light_score: number;
  created_at: string;
  mint_status: string;
  tx_hash: string | null;
  quality_score: number;
  impact_score: number;
  integrity_score: number;
  unity_score: number;
  base_reward: number;
}

export const LightActionsList = () => {
  const [allActions, setAllActions] = useState<AllAction[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const { actions: pendingActions, totalAmount: pendingTotal, claim, isClaiming } = usePendingActions();

  const fetchAllActions = useCallback(async () => {
    setIsLoadingAll(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('light_actions')
        .select('id, action_type, content_preview, mint_amount, light_score, created_at, mint_status, tx_hash, quality_score, impact_score, integrity_score, unity_score, base_reward')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) setAllActions(data);
    } catch (err) {
      console.error('[LightActionsList] Error:', err);
    } finally {
      setIsLoadingAll(false);
    }
  }, []);

  useEffect(() => { fetchAllActions(); }, [fetchAllActions]);

  const handleClaimAll = async () => {
    if (pendingActions.length === 0) return;
    const ids = pendingActions.map(a => a.id);
    const result = await claim(ids);
    if (result.success) fetchAllActions();
  };

  const handleClaimSingle = async (id: string) => {
    const result = await claim([id]);
    if (result.success) fetchAllActions();
  };

  // Stats
  const approvedCount = allActions.filter(a => a.mint_status === 'approved').length;
  const pendingCount = allActions.filter(a => ['pending', 'pending_sig'].includes(a.mint_status)).length;
  const mintedCount = allActions.filter(a => ['minted', 'confirmed'].includes(a.mint_status)).length;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Light Actions của bạn
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchAllActions} disabled={isLoadingAll}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingAll ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Sẵn sàng</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Đang chờ</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <p className="text-2xl font-bold text-blue-600">{mintedCount}</p>
            <p className="text-xs text-muted-foreground">Đã mint</p>
          </div>
        </div>

        {/* Claim All button */}
        {pendingTotal > 0 && (
          <Button
            onClick={handleClaimAll}
            disabled={isClaiming}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {isClaiming ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang tạo yêu cầu...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Claim tất cả {pendingTotal} FUN</>
            )}
          </Button>
        )}

        {/* Actions list */}
        {isLoadingAll ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : allActions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Chưa có hoạt động nào. Hãy tạo bài viết hoặc tương tác để kiếm Light Score! 🌟
          </p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {allActions.map(action => (
              <LightActionCard
                key={action.id}
                action={action}
                onClaim={action.mint_status === 'approved' ? handleClaimSingle : undefined}
                isClaiming={isClaiming}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
