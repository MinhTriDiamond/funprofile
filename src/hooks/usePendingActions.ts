import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LightAction {
  id: string;
  action_type: string;
  content_preview: string | null;
  mint_amount: number;
  light_score: number;
  created_at: string;
  mint_status: string;
}

export interface GroupedActions {
  action_type: string;
  count: number;
  total_amount: number;
  items: LightAction[];
}

export interface PendingActionsResult {
  actions: LightAction[];
  groupedByType: GroupedActions[];
  totalAmount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  claim: (actionIds: string[]) => Promise<{ success: boolean; requestId?: string }>;
  isClaiming: boolean;
}

export const usePendingActions = (): PendingActionsResult => {
  const [actions, setActions] = useState<LightAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchPendingActions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setActions([]);
        return;
      }

      // Fetch approved actions that haven't been claimed yet
      const { data, error: fetchError } = await supabase
        .from('light_actions')
        .select('id, action_type, content_preview, mint_amount, light_score, created_at, mint_status')
        .eq('user_id', session.user.id)
        .eq('mint_status', 'approved')
        .eq('is_eligible', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setActions(data || []);
    } catch (err) {
      console.error('[usePendingActions] Error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingActions();
  }, [fetchPendingActions]);

  // Group actions by type
  const groupedByType: GroupedActions[] = actions.reduce((acc, action) => {
    const existing = acc.find(g => g.action_type === action.action_type);
    if (existing) {
      existing.count++;
      existing.total_amount += action.mint_amount || 0;
      existing.items.push(action);
    } else {
      acc.push({
        action_type: action.action_type,
        count: 1,
        total_amount: action.mint_amount || 0,
        items: [action],
      });
    }
    return acc;
  }, [] as GroupedActions[]);

  const totalAmount = actions.reduce((sum, a) => sum + (a.mint_amount || 0), 0);

  const claim = useCallback(async (actionIds: string[]): Promise<{ success: boolean; requestId?: string }> => {
    if (actionIds.length === 0) {
      toast.error('Không có actions nào để claim');
      return { success: false };
    }

    setIsClaiming(true);
    
    try {
      const { data, error: claimError } = await supabase.functions.invoke('pplp-mint-fun', {
        body: { action_ids: actionIds },
      });

      if (claimError) throw claimError;
      
      if (!data.success) {
        throw new Error(data.error || 'Claim failed');
      }

      toast.success(`Đã tạo yêu cầu claim ${data.mint_request.amount} FUN!`, {
        description: 'Chờ Admin ký để nhận tokens.',
      });

      // Refetch to update the list
      await fetchPendingActions();

      return { success: true, requestId: data.mint_request.id };
    } catch (err: any) {
      console.error('[usePendingActions] Claim error:', err);
      toast.error(err.message || 'Không thể claim rewards');
      return { success: false };
    } finally {
      setIsClaiming(false);
    }
  }, [fetchPendingActions]);

  return {
    actions,
    groupedByType,
    totalAmount,
    isLoading,
    error,
    refetch: fetchPendingActions,
    claim,
    isClaiming,
  };
};
