import { useState, useEffect, useCallback } from 'react';

export interface BtcTransaction {
  txid: string;
  type: 'sent' | 'received';
  amount: number; // in BTC
  timestamp: number; // unix seconds
  confirmed: boolean;
  blockHeight?: number;
}

export function useBtcTransactions(btcAddress: string | null | undefined) {
  const [transactions, setTransactions] = useState<BtcTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTxs = useCallback(async () => {
    if (!btcAddress) { setTransactions([]); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`https://mempool.space/api/address/${btcAddress}/txs`);
      if (!res.ok) throw new Error(`Mempool API error: ${res.status}`);
      const data = await res.json();

      const parsed: BtcTransaction[] = (data as any[]).slice(0, 50).map((tx: any) => {
        // Calculate net value for this address
        let inputSum = 0;
        let outputSum = 0;
        for (const vin of tx.vin || []) {
          if (vin.prevout?.scriptpubkey_address === btcAddress) {
            inputSum += vin.prevout.value || 0;
          }
        }
        for (const vout of tx.vout || []) {
          if (vout.scriptpubkey_address === btcAddress) {
            outputSum += vout.value || 0;
          }
        }
        const net = outputSum - inputSum; // positive = received, negative = sent
        return {
          txid: tx.txid,
          type: net >= 0 ? 'received' : 'sent',
          amount: Math.abs(net) / 1e8,
          timestamp: tx.status?.block_time || Math.floor(Date.now() / 1000),
          confirmed: !!tx.status?.confirmed,
          blockHeight: tx.status?.block_height,
        } as BtcTransaction;
      });

      setTransactions(parsed);
    } catch (err) {
      console.error('[useBtcTransactions] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [btcAddress]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  return { transactions, isLoading, refetch: fetchTxs };
}
