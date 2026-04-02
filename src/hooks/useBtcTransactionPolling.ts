import { useState, useEffect, useRef, useCallback } from 'react';

export interface BtcPollingResult {
  status: 'idle' | 'polling' | 'found' | 'timeout';
  txid: string | null;
  confirmed: boolean;
}

const POLL_INTERVAL = 15_000; // 15 seconds
const TIMEOUT = 10 * 60_000; // 10 minutes

export function useBtcTransactionPolling(
  recipientBtcAddress: string | null | undefined,
  expectedAmountBtc: number,
  enabled: boolean,
) {
  const [result, setResult] = useState<BtcPollingResult>({ status: 'idle', txid: null, confirmed: false });
  const baselineTxidsRef = useRef<Set<string>>(new Set());
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const markManualSend = useCallback(() => {
    stop();
    const manualHash = `btc-manual-${Date.now()}`;
    setResult({ status: 'found', txid: manualHash, confirmed: false });
  }, [stop]);

  useEffect(() => {
    if (!enabled || !recipientBtcAddress) {
      setResult({ status: 'idle', txid: null, confirmed: false });
      return;
    }

    let cancelled = false;
    startTimeRef.current = Date.now();

    const fetchTxs = async (): Promise<any[]> => {
      try {
        const res = await fetch(`https://mempool.space/api/address/${recipientBtcAddress}/txs`);
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    };

    // Capture baseline first
    const init = async () => {
      const baseline = await fetchTxs();
      baseline.forEach((tx: any) => baselineTxidsRef.current.add(tx.txid));
      setResult({ status: 'polling', txid: null, confirmed: false });

      intervalRef.current = setInterval(async () => {
        if (cancelled) return;

        // Check timeout
        if (Date.now() - startTimeRef.current > TIMEOUT) {
          stop();
          setResult(prev => prev.status === 'found' ? prev : { status: 'timeout', txid: null, confirmed: false });
          return;
        }

        const txs = await fetchTxs();
        for (const tx of txs) {
          if (baselineTxidsRef.current.has(tx.txid)) continue;
          // New tx found — check if it has output to recipient
          const hasOutput = (tx.vout || []).some((vout: any) =>
            vout.scriptpubkey_address === recipientBtcAddress
          );
          if (hasOutput) {
            stop();
            setResult({
              status: 'found',
              txid: tx.txid,
              confirmed: !!tx.status?.confirmed,
            });
            return;
          }
        }
      }, POLL_INTERVAL);
    };

    init();

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, recipientBtcAddress, expectedAmountBtc, stop]);

  return { ...result, stop, markManualSend };
}
