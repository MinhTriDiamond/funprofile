import { useState, useCallback, useEffect } from 'react';
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
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const useMintHistory = (): UseMintHistoryResult => {
  const [allRequests, setAllRequests] = useState<MintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    fetchHistory();
  }, [fetchHistory]);

  const activeStatuses = ['pending_sig', 'signed', 'submitted'];
  const activeRequests = allRequests.filter(r => activeStatuses.includes(r.status));
  const historyRequests = allRequests.filter(r => !activeStatuses.includes(r.status));
  const hasPendingRequests = activeRequests.length > 0;

  return {
    allRequests,
    activeRequests,
    historyRequests,
    hasPendingRequests,
    isLoading,
    refetch: fetchHistory,
  };
};
