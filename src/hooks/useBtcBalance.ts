import { useState, useEffect, useCallback, useRef } from 'react';

interface UseBtcBalanceResult {
  balance: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const parseBalanceFromData = (data: any): number => {
  const funded = data.chain_stats?.funded_txo_sum ?? 0;
  const spent = data.chain_stats?.spent_txo_sum ?? 0;
  const mempoolFunded = data.mempool_stats?.funded_txo_sum ?? 0;
  const mempoolSpent = data.mempool_stats?.spent_txo_sum ?? 0;
  return ((funded - spent) + (mempoolFunded - mempoolSpent)) / 1e8;
};

const fetchWithRetry = async (addr: string, retries = 2): Promise<number> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://mempool.space/api/address/${addr}`);
      if (!res.ok) throw new Error(`Mempool API error: ${res.status}`);
      const data = await res.json();
      return parseBalanceFromData(data);
    } catch (err) {
      if (i === retries) {
        // Fallback to Blockstream API
        try {
          const res2 = await fetch(`https://blockstream.info/api/address/${addr}`);
          if (!res2.ok) throw new Error(`Blockstream API error: ${res2.status}`);
          const data2 = await res2.json();
          return parseBalanceFromData(data2);
        } catch {
          throw new Error('All BTC APIs failed');
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return 0;
};

export function useBtcBalance(btcAddress: string | null | undefined): UseBtcBalanceResult {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!btcAddress) {
      setBalance(0);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchWithRetry(btcAddress);
      setBalance(result);
    } catch (err) {
      console.error('[useBtcBalance] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [btcAddress]);

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    fetchBalance();

    if (btcAddress) {
      intervalRef.current = setInterval(fetchBalance, 60000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBalance, btcAddress]);

  // Refresh when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && btcAddress) {
        fetchBalance();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchBalance, btcAddress]);

  return { balance, isLoading, error, refetch: fetchBalance };
}
