import { useState, useEffect, useCallback } from 'react';

export interface BtcTransaction {
  txid: string;
  type: 'sent' | 'received';
  amount: number; // in BTC
  timestamp: number; // unix seconds
  confirmed: boolean;
  blockHeight?: number;
}

function parseTxsForAddress(data: any[], address: string): BtcTransaction[] {
  return data.slice(0, 50).map((tx: any) => {
    let inputSum = 0;
    let outputSum = 0;
    for (const vin of tx.vin || []) {
      if (vin.prevout?.scriptpubkey_address === address) {
        inputSum += vin.prevout.value || 0;
      }
    }
    for (const vout of tx.vout || []) {
      if (vout.scriptpubkey_address === address) {
        outputSum += vout.value || 0;
      }
    }
    const net = outputSum - inputSum;
    return {
      txid: tx.txid,
      type: net >= 0 ? 'received' : 'sent',
      amount: Math.abs(net) / 1e8,
      timestamp: tx.status?.block_time || Math.floor(Date.now() / 1000),
      confirmed: !!tx.status?.confirmed,
      blockHeight: tx.status?.block_height,
    } as BtcTransaction;
  });
}

async function fetchTxsForAddress(address: string): Promise<BtcTransaction[]> {
  try {
    const res = await fetch(`https://mempool.space/api/address/${address}/txs`);
    if (!res.ok) throw new Error(`Mempool API error: ${res.status}`);
    const data = await res.json();
    return parseTxsForAddress(data as any[], address);
  } catch (err) {
    console.warn(`[useBtcTransactions] Failed for ${address}:`, err);
    return [];
  }
}

export function useBtcTransactions(
  btcAddress: string | null | undefined,
  extraAddresses?: string[]
) {
  const [transactions, setTransactions] = useState<BtcTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const fetchTxs = useCallback(async () => {
    if (allAddresses.length === 0) { setTransactions([]); return; }
    setIsLoading(true);
    try {
      const results = await Promise.all(
        allAddresses.map(addr => fetchTxsForAddress(addr))
      );

      // Merge and deduplicate by txid, sort by timestamp desc
      const txMap = new Map<string, BtcTransaction>();
      for (const txList of results) {
        for (const tx of txList) {
          const existing = txMap.get(tx.txid);
          if (existing) {
            // Aggregate amounts for same tx across addresses
            existing.amount += tx.amount;
          } else {
            txMap.set(tx.txid, { ...tx });
          }
        }
      }

      const merged = Array.from(txMap.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);

      setTransactions(merged);
    } catch (err) {
      console.error('[useBtcTransactions] Error:', err);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressesKey]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  return { transactions, isLoading, refetch: fetchTxs };
}
