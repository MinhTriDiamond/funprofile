import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EpochAllocation {
  id: string;
  epoch_id: string;
  light_score_total: number;
  share_percent: number;
  allocation_amount: number;
  allocation_amount_capped: number;
  is_eligible: boolean;
  reason_codes: string[];
  status: string;
  mint_request_id: string | null;
  created_at: string;
}

export interface EpochInfo {
  id: string;
  epoch_month: string;
  mint_pool: number;
  total_light_score: number;
  eligible_users: number;
  status: string; // open / snapshot / finalized
  snapshot_at: string | null;
  rules_version: string;
}

export interface CurrentMonthLight {
  total_light_score: number;
  actions_count: number;
  epoch_month: string;
}

export interface EpochAllocationResult {
  // Current month accumulation (live)
  currentMonth: CurrentMonthLight;
  // Latest epoch with snapshot (claimable)
  latestEpoch: EpochInfo | null;
  allocation: EpochAllocation | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  claim: (allocationId: string) => Promise<{ success: boolean; requestId?: string }>;
  isClaiming: boolean;
}

export const useEpochAllocation = (): EpochAllocationResult => {
  const [currentMonth, setCurrentMonth] = useState<CurrentMonthLight>({
    total_light_score: 0,
    actions_count: 0,
    epoch_month: new Date().toISOString().slice(0, 7),
  });
  const [latestEpoch, setLatestEpoch] = useState<EpochInfo | null>(null);
  const [allocation, setAllocation] = useState<EpochAllocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setCurrentMonth({ total_light_score: 0, actions_count: 0, epoch_month: new Date().toISOString().slice(0, 7) });
        setLatestEpoch(null);
        setAllocation(null);
        return;
      }

      const userId = session.user.id;
      const now = new Date();
      const epochMonth = now.toISOString().slice(0, 7);
      const monthStart = `${epochMonth}-01T00:00:00Z`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      // 1. Current month light score accumulation
      const { data: monthActions, error: monthErr } = await supabase
        .from('light_actions')
        .select('light_score')
        .eq('user_id', userId)
        .eq('is_eligible', true)
        .gte('created_at', monthStart)
        .lt('created_at', nextMonth);

      if (monthErr) throw monthErr;

      const totalLight = (monthActions || []).reduce((sum, a) => sum + (a.light_score || 0), 0);
      setCurrentMonth({
        total_light_score: Math.round(totalLight * 100) / 100,
        actions_count: monthActions?.length || 0,
        epoch_month: epochMonth,
      });

      // 2. Find latest epoch with snapshot status (claimable)
      const { data: epochs, error: epochErr } = await supabase
        .from('mint_epochs')
        .select('id, epoch_month, mint_pool, total_light_score, eligible_users, status, snapshot_at, rules_version')
        .in('status', ['snapshot', 'finalized'])
        .order('epoch_month', { ascending: false })
        .limit(1);

      if (epochErr) throw epochErr;

      if (epochs && epochs.length > 0) {
        const epoch = epochs[0] as any;
        setLatestEpoch({
          id: epoch.id,
          epoch_month: epoch.epoch_month || '',
          mint_pool: epoch.mint_pool || 0,
          total_light_score: epoch.total_light_score || 0,
          eligible_users: epoch.eligible_users || 0,
          status: epoch.status || 'open',
          snapshot_at: epoch.snapshot_at || null,
          rules_version: epoch.rules_version || 'LS-Math-v1.0',
        });

        // 3. Get user's allocation for this epoch
        const { data: alloc, error: allocErr } = await supabase
          .from('mint_allocations')
          .select('*')
          .eq('epoch_id', epoch.id)
          .eq('user_id', userId)
          .maybeSingle();

        if (allocErr) throw allocErr;

        if (alloc) {
          setAllocation(alloc as any);
        } else {
          setAllocation(null);
        }
      } else {
        setLatestEpoch(null);
        setAllocation(null);
      }
    } catch (err) {
      console.error('[useEpochAllocation] Error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      await fetchData();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !isMounted) return;

      // Subscribe to allocation changes
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`epoch-alloc-${session.user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'mint_allocations',
          filter: `user_id=eq.${session.user.id}`,
        }, () => {
          if (isMounted) fetchData();
        })
        .subscribe();

      channelRef.current = channel;
    };

    setup();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchData]);

  const claim = useCallback(async (allocationId: string): Promise<{ success: boolean; requestId?: string }> => {
    setIsClaiming(true);
    try {
      const { data, error: claimErr } = await supabase.functions.invoke('pplp-mint-fun', {
        body: { allocation_id: allocationId },
      });

      if (claimErr) throw claimErr;
      if (!data.success) throw new Error(data.error || 'Claim failed');

      toast.success(`Đã tạo yêu cầu claim ${data.mint_request?.amount || ''} FUN!`, {
        description: 'Chờ Admin ký để nhận tokens.',
      });

      await fetchData();
      return { success: true, requestId: data.mint_request?.id };
    } catch (err: unknown) {
      console.error('[useEpochAllocation] Claim error:', err);
      toast.error(err instanceof Error ? err.message : 'Không thể claim rewards');
      return { success: false };
    } finally {
      setIsClaiming(false);
    }
  }, [fetchData]);

  return {
    currentMonth,
    latestEpoch,
    allocation,
    isLoading,
    error,
    refetch: fetchData,
    claim,
    isClaiming,
  };
};
