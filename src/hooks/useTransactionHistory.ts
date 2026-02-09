import { useState, useEffect, useCallback } from 'react';
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

export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient();

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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

      setTransactions(prev =>
        prev.map(tx =>
          tx.tx_hash === txHash ? { ...tx, status: newStatus } : tx
        )
      );
    } catch {
      // Receipt not available yet — still pending
    }
  }, [publicClient]);

  const refreshAll = useCallback(async () => {
    const pendingTxs = transactions.filter(tx => tx.status === 'pending');
    await Promise.allSettled(pendingTxs.map(tx => refreshTxStatus(tx.tx_hash)));
    await fetchTransactions();
  }, [transactions, refreshTxStatus, fetchTransactions]);

  return { transactions, isLoading, refreshTxStatus, refreshAll, refetch: fetchTransactions };
}
