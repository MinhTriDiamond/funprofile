import { useState, useEffect, useCallback } from 'react';

interface UseBtcBalanceResult {
  balance: number;
  isLoading: boolean;
  refetch: () => void;
}

export function useBtcBalance(btcAddress: string | null | undefined): UseBtcBalanceResult {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!btcAddress) {
      setBalance(0);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`https://mempool.space/api/address/${btcAddress}`);
      if (!res.ok) throw new Error(`Mempool API error: ${res.status}`);
      const data = await res.json();

      const funded = data.chain_stats?.funded_txo_sum ?? 0;
      const spent = data.chain_stats?.spent_txo_sum ?? 0;
      const mempoolFunded = data.mempool_stats?.funded_txo_sum ?? 0;
      const mempoolSpent = data.mempool_stats?.spent_txo_sum ?? 0;

      const totalSats = (funded - spent) + (mempoolFunded - mempoolSpent);
      setBalance(totalSats / 1e8);
    } catch (err) {
      console.error('[useBtcBalance] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [btcAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, isLoading, refetch: fetchBalance };
}
