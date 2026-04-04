import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface BtcBalanceDetails {
  balance: number;
  totalReceived: number;
  totalSent: number;
  txCount: number;
}

interface UseBtcBalanceResult {
  balance: number;
  totalReceived: number;
  totalSent: number;
  txCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const EMPTY: BtcBalanceDetails = { balance: 0, totalReceived: 0, totalSent: 0, txCount: 0 };

const parseDetailsFromData = (data: any): BtcBalanceDetails => {
  const funded = data.chain_stats?.funded_txo_sum ?? 0;
  const spent = data.chain_stats?.spent_txo_sum ?? 0;
  const mempoolFunded = data.mempool_stats?.funded_txo_sum ?? 0;
  const mempoolSpent = data.mempool_stats?.spent_txo_sum ?? 0;
  const chainTx = data.chain_stats?.tx_count ?? 0;
  const mempoolTx = data.mempool_stats?.tx_count ?? 0;

  return {
    balance: ((funded - spent) + (mempoolFunded - mempoolSpent)) / 1e8,
    totalReceived: (funded + mempoolFunded) / 1e8,
    totalSent: (spent + mempoolSpent) / 1e8,
    txCount: chainTx + mempoolTx,
  };
};

const fetchSingleAddress = async (addr: string, retries = 2): Promise<BtcBalanceDetails> => {
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
  return EMPTY;
};

/** Normalize input to array of unique addresses */
const normalizeAddresses = (input: string | string[] | null | undefined): string[] => {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  return [...new Set(arr.filter(a => typeof a === 'string' && a.length > 0))];
};

/**
 * Fetch and aggregate BTC balance across one or multiple addresses.
 * Accepts a single address string, an array of addresses, or null.
 */
export function useBtcBalance(btcAddress: string | string[] | null | undefined): UseBtcBalanceResult {
  const [details, setDetails] = useState<BtcBalanceDetails>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBalanceRef = useRef<number | null>(null);

  const addresses = normalizeAddresses(btcAddress);
  const addressKey = addresses.join(',');

  const fetchBalance = useCallback(async () => {
    if (addresses.length === 0) {
      setDetails(EMPTY);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.all(addresses.map(a => fetchSingleAddress(a)));
      const aggregated: BtcBalanceDetails = results.reduce(
        (acc, r) => ({
          balance: acc.balance + r.balance,
          totalReceived: acc.totalReceived + r.totalReceived,
          totalSent: acc.totalSent + r.totalSent,
          txCount: acc.txCount + r.txCount,
        }),
        { ...EMPTY },
      );

      // Toast khi phát hiện nhận BTC mới
      if (prevBalanceRef.current !== null && aggregated.balance > prevBalanceRef.current) {
        const diff = aggregated.balance - prevBalanceRef.current;
        toast.success(`📥 Nhận ${diff.toFixed(8)} BTC mới!`);
      }
      prevBalanceRef.current = aggregated.balance;

      setDetails(aggregated);
    } catch (err) {
      console.error('[useBtcBalance] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [addressKey]);

  useEffect(() => {
    prevBalanceRef.current = null;
    fetchBalance();
    if (addresses.length > 0) {
      intervalRef.current = setInterval(fetchBalance, 60000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBalance, addressKey]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && addresses.length > 0) {
        fetchBalance();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchBalance, addressKey]);

  return {
    balance: details.balance,
    totalReceived: details.totalReceived,
    totalSent: details.totalSent,
    txCount: details.txCount,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
