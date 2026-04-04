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
          throw new Error(`Failed to fetch balance for ${addr}`);
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return { balance: 0, totalReceived: 0, totalSent: 0, txCount: 0 };
};

const fetchMultipleAddresses = async (addresses: string[]): Promise<BtcBalanceDetails> => {
  if (addresses.length === 0) return { balance: 0, totalReceived: 0, totalSent: 0, txCount: 0 };

  // Fetch all addresses in parallel
  const results = await Promise.allSettled(
    addresses.map(addr => fetchSingleAddress(addr))
  );

  let totalBalance = 0;
  let totalReceived = 0;
  let totalSent = 0;
  let totalTxCount = 0;
  let hasAtLeastOne = false;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      hasAtLeastOne = true;
      totalBalance += result.value.balance;
      totalReceived += result.value.totalReceived;
      totalSent += result.value.totalSent;
      totalTxCount += result.value.txCount;
    } else {
      console.warn('[useBtcBalance] One address failed:', result.reason);
    }
  }

  if (!hasAtLeastOne) {
    throw new Error('All BTC APIs failed for all addresses');
  }

  return {
    balance: totalBalance,
    totalReceived: totalReceived,
    totalSent: totalSent,
    txCount: totalTxCount,
  };
};

export function useBtcBalance(
  btcAddress: string | null | undefined,
  extraAddresses?: string[]
): UseBtcBalanceResult {
  const [details, setDetails] = useState<BtcBalanceDetails>({ balance: 0, totalReceived: 0, totalSent: 0, txCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBalanceRef = useRef<number | null>(null);

  // Build unique list of all addresses
  const allAddresses = (() => {
    const set = new Set<string>();
    if (btcAddress) set.add(btcAddress);
    if (extraAddresses) {
      for (const a of extraAddresses) {
        if (a && a.trim()) set.add(a.trim());
      }
    }
    return Array.from(set);
  })();

  const addressesKey = allAddresses.sort().join(',');

  const fetchBalance = useCallback(async () => {
    if (allAddresses.length === 0) {
      setDetails({ balance: 0, totalReceived: 0, totalSent: 0, txCount: 0 });
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchMultipleAddresses(allAddresses);
      
      // Toast khi phát hiện nhận BTC mới
      if (prevBalanceRef.current !== null && result.balance > prevBalanceRef.current) {
        const diff = result.balance - prevBalanceRef.current;
        toast.success(`📥 Nhận ${diff.toFixed(8)} BTC mới!`);
      }
      prevBalanceRef.current = result.balance;
      
      setDetails(result);
    } catch (err) {
      console.error('[useBtcBalance] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressesKey]);

  useEffect(() => {
    prevBalanceRef.current = null;
    fetchBalance();
    if (allAddresses.length > 0) {
      intervalRef.current = setInterval(fetchBalance, 60000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBalance, addressesKey]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && allAddresses.length > 0) {
        fetchBalance();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBalance, addressesKey]);

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
