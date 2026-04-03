import { useState, useEffect, useCallback, useRef } from 'react';

interface BtcBalanceDetails {
  confirmedBalance: number;
  pendingBalance: number;
  totalReceived: number;
  totalSent: number;
  txCount: number;
}

interface UseBtcBalanceResult {
  balance: number;
  details: BtcBalanceDetails;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const DEFAULT_DETAILS: BtcBalanceDetails = {
  confirmedBalance: 0,
  pendingBalance: 0,
  totalReceived: 0,
  totalSent: 0,
  txCount: 0,
};

const parseDetailsFromData = (data: any): { balance: number; details: BtcBalanceDetails } => {
  const funded = data.chain_stats?.funded_txo_sum ?? 0;
  const spent = data.chain_stats?.spent_txo_sum ?? 0;
  const mempoolFunded = data.mempool_stats?.funded_txo_sum ?? 0;
  const mempoolSpent = data.mempool_stats?.spent_txo_sum ?? 0;
  const txCount = (data.chain_stats?.tx_count ?? 0) + (data.mempool_stats?.tx_count ?? 0);

  const confirmedBalance = (funded - spent) / 1e8;
  const pendingBalance = (mempoolFunded - mempoolSpent) / 1e8;
  const totalReceived = (funded + mempoolFunded) / 1e8;
  const totalSent = (spent + mempoolSpent) / 1e8;

  return {
    balance: confirmedBalance + pendingBalance,
    details: { confirmedBalance, pendingBalance, totalReceived, totalSent, txCount },
  };
};

const fetchWithRetry = async (addr: string, retries = 2): Promise<{ balance: number; details: BtcBalanceDetails }> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://mempool.space/api/address/${addr}`);
      if (!res.ok) throw new Error(`Mempool API error: ${res.status}`);
      const data = await res.json();
      return parseDetailsFromData(data);
    } catch (err) {
      if (i === retries) {
        try {
          const res2 = await fetch(`https://blockstream.info/api/address/${addr}`);
          if (!res2.ok) throw new Error(`Blockstream API error: ${res2.status}`);
          const data2 = await res2.json();
          return parseDetailsFromData(data2);
        } catch {
          throw new Error('All BTC APIs failed');
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return { balance: 0, details: DEFAULT_DETAILS };
};

export function useBtcBalance(btcAddress: string | null | undefined): UseBtcBalanceResult {
  const [balance, setBalance] = useState(0);
  const [details, setDetails] = useState<BtcBalanceDetails>(DEFAULT_DETAILS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!btcAddress) {
      setBalance(0);
      setDetails(DEFAULT_DETAILS);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchWithRetry(btcAddress);
      setBalance(result.balance);
      setDetails(result.details);
    } catch (err) {
      console.error('[useBtcBalance] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [btcAddress]);

  useEffect(() => {
    fetchBalance();
    if (btcAddress) {
      intervalRef.current = setInterval(fetchBalance, 60000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBalance, btcAddress]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && btcAddress) {
        fetchBalance();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchBalance, btcAddress]);

  return { balance, details, isLoading, error, refetch: fetchBalance };
}
