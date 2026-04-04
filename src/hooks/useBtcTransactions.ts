import { useState, useEffect, useCallback } from 'react';

export interface BtcTransaction {
  txid: string;
  type: 'sent' | 'received';
  amount: number; // in BTC
  timestamp: number; // unix seconds
  confirmed: boolean;
  blockHeight?: number;
}

/** Normalize input to array of unique addresses */
const normalizeAddresses = (input: string | string[] | null | undefined): string[] => {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  return [...new Set(arr.filter(a => typeof a === 'string' && a.length > 0))];
};

export function useBtcTransactions(btcAddress: string | string[] | null | undefined) {
  const [transactions, setTransactions] = useState<BtcTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addresses = normalizeAddresses(btcAddress);
  const addressKey = addresses.join(',');

  const fetchTxs = useCallback(async () => {
    if (addresses.length === 0) { setTransactions([]); return; }
    setIsLoading(true);
    try {
      const allTxs: BtcTransaction[] = [];
      const seenTxids = new Set<string>();

      for (const addr of addresses) {
        const res = await fetch(`https://mempool.space/api/address/${addr}/txs`);
        if (!res.ok) continue;
        const data = await res.json();

        const parsed: BtcTransaction[] = (data as any[]).slice(0, 50).map((tx: any) => {
          let inputSum = 0;
          let outputSum = 0;
          for (const vin of tx.vin || []) {
            if (addresses.includes(vin.prevout?.scriptpubkey_address)) {
              inputSum += vin.prevout.value || 0;
            }
          }
          for (const vout of tx.vout || []) {
            if (addresses.includes(vout.scriptpubkey_address)) {
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

        for (const tx of parsed) {
          if (!seenTxids.has(tx.txid)) {
            seenTxids.add(tx.txid);
            allTxs.push(tx);
          }
        }
      }

      // Sort by timestamp descending
      allTxs.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(allTxs.slice(0, 100));
    } catch (err) {
      console.error('[useBtcTransactions] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [addressKey]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  return { transactions, isLoading, refetch: fetchTxs };
}
