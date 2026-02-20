import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MintRequest {
  id: string;
  amount_display: number;
  status: string;
  created_at: string;
  updated_at: string;
  action_ids: string[] | null;
  action_types: string[] | null;
  recipient_address: string | null;
  tx_hash: string | null;
}

export interface UseMintHistoryResult {
  allRequests: MintRequest[];
  activeRequests: MintRequest[]; // pending_sig, signed, submitted
  historyRequests: MintRequest[]; // confirmed, failed
  hasPendingRequests: boolean;
  todayRequestCount: number;
  isLoading: boolean;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

export const useMintHistory = (): UseMintHistoryResult => {
  const [allRequests, setAllRequests] = useState<MintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAllRequests([]); return; }

      const { data, error } = await supabase
        .from('pplp_mint_requests')
        .select('id, amount_display, status, created_at, updated_at, action_ids, action_types, recipient_address, tx_hash')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllRequests(data || []);
    } catch (err) {
      console.error('[useMintHistory] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      // Initial fetch
      await fetchHistory();

      // Cleanup previous channel if any
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Subscribe to realtime changes filtered by user_id
      const channel = supabase
        .channel(`mint-history-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'pplp_mint_requests',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!isMounted) return;
            console.log('[useMintHistory] Realtime UPDATE:', payload.new);
            // Optimistic: update only the changed row, no re-fetch needed
            setAllRequests(prev => prev.map(r =>
              r.id === payload.new.id
                ? { ...r, ...(payload.new as MintRequest) }
                : r
            ));
            setLastUpdated(new Date());
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pplp_mint_requests',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!isMounted) return;
            console.log('[useMintHistory] Realtime INSERT:', payload.new);
            // Prepend new request to the list
            setAllRequests(prev => [payload.new as MintRequest, ...prev]);
            setLastUpdated(new Date());
          }
        )
        .subscribe((status) => {
          console.log('[useMintHistory] Realtime subscription status:', status);
        });

      channelRef.current = channel;
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchHistory]);

  const activeStatuses = ['pending_sig', 'signed', 'submitted'];
  const activeRequests = allRequests.filter(r => activeStatuses.includes(r.status));
  const historyRequests = allRequests.filter(r => !activeStatuses.includes(r.status));
  const hasPendingRequests = activeRequests.length > 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRequestCount = allRequests.filter(r =>
    r.created_at.startsWith(todayStr) && r.status !== 'failed'
  ).length;

  return {
    allRequests,
    activeRequests,
    historyRequests,
    hasPendingRequests,
    todayRequestCount,
    isLoading,
    lastUpdated,
    refetch: fetchHistory,
  };
};
