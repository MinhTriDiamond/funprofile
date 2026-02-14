import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';

export interface Transaction {
  id: string;
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount: string;
  token_symbol: string;
  chain_id: number;
  status: string;
  created_at: string;
}

const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data as Transaction[];
};

export function useTransactionHistory() {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transaction-history'],
    queryFn: fetchTransactions,
  });

  const refreshTxStatus = useCallback(async (txHash: string) => {
    if (!publicClient) return;
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      const newStatus = receipt.status === 'success' ? 'confirmed' : 'failed';

      await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('tx_hash', txHash);

      queryClient.invalidateQueries({ queryKey: ['transaction-history'] });
    } catch {
      // Receipt not available yet — still pending
    }
  }, [publicClient, queryClient]);

  const refreshAll = useCallback(async () => {
    const pendingTxs = transactions.filter(tx => tx.status === 'pending');
    await Promise.allSettled(pendingTxs.map(tx => refreshTxStatus(tx.tx_hash)));
    queryClient.invalidateQueries({ queryKey: ['transaction-history'] });
  }, [transactions, refreshTxStatus, queryClient]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['transaction-history'] });
  }, [queryClient]);

  return { transactions, isLoading, refreshTxStatus, refreshAll, refetch };
}
