/**
 * useIncomingTransferDetector
 * 
 * Polls BSC RPC every 15 seconds for ERC20 Transfer events TO the current user's wallet.
 * When a new transfer is detected, calls record-instant-donation to create
 * donation + post + notification + chat message instantly (~15s latency).
 * 
 * Uses multiple RPC endpoints with automatic rotation on rate-limit errors.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Multiple BSC RPC endpoints for fallback rotation
const BSC_RPCS = [
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.defibit.io',
];

const BSC_TESTNET_RPCS = [
  'https://data-seed-prebsc-1-s1.binance.org:8545',
  'https://data-seed-prebsc-2-s1.binance.org:8545',
];

// ERC20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Known token contracts to watch — query each separately to reduce load
const WATCHED_CONTRACTS = {
  mainnet: [
    '0x55d398326f99059fF775485246999027B3197955', // USDT
    '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB
    '0x0910320181889feFDE0BB1Ca63962b0A8882e413', // CAMLY
  ],
  testnet: [
    '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6', // FUN
  ],
};

const POLL_INTERVAL = 15_000;
const BLOCKS_LOOKBACK = 3; // ~9 seconds on BSC (3s/block), smaller to avoid rate limits

interface TransferLog {
  transactionHash: string;
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
}

async function rpcCall(rpcs: string[], rpcIndex: { current: number }, method: string, params: unknown[]): Promise<unknown> {
  let lastError: Error | null = null;
  
  // Try each RPC endpoint, starting from current index
  for (let attempt = 0; attempt < rpcs.length; attempt++) {
    const idx = (rpcIndex.current + attempt) % rpcs.length;
    const rpcUrl = rpcs[idx];
    
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      const json = await res.json();
      
      if (json.error) {
        // Rate limited — rotate to next RPC
        if (json.error.code === -32005 || json.error.message?.includes('limit')) {
          rpcIndex.current = (idx + 1) % rpcs.length;
          lastError = new Error(json.error.message);
          continue;
        }
        throw new Error(json.error.message);
      }
      
      // Success — remember this good RPC
      rpcIndex.current = idx;
      return json.result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      rpcIndex.current = (idx + 1) % rpcs.length;
    }
  }
  
  throw lastError || new Error('All RPCs failed');
}

async function getBlockNumber(rpcs: string[], rpcIndex: { current: number }): Promise<number> {
  const result = await rpcCall(rpcs, rpcIndex, 'eth_blockNumber', []);
  return parseInt(result as string, 16);
}

async function getLogsForContract(
  rpcs: string[],
  rpcIndex: { current: number },
  contract: string,
  toAddressPadded: string,
  fromBlock: number,
  toBlock: number
): Promise<TransferLog[]> {
  try {
    const result = await rpcCall(rpcs, rpcIndex, 'eth_getLogs', [{
      fromBlock: '0x' + fromBlock.toString(16),
      toBlock: '0x' + toBlock.toString(16),
      address: contract, // Single contract per query
      topics: [TRANSFER_TOPIC, null, toAddressPadded],
    }]);
    return (result as TransferLog[]) || [];
  } catch {
    return [];
  }
}

export function useIncomingTransferDetector() {
  const { userId } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const processedTxs = useRef(new Set<string>());
  const lastBlockMainnet = useRef(0);
  const lastBlockTestnet = useRef(0);
  const mainnetRpcIdx = useRef(0);
  const testnetRpcIdx = useRef(0);

  // Fetch user's wallet address
  const { data: walletAddress } = useQuery({
    queryKey: ['user-wallet-for-detector', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('public_wallet_address')
        .eq('id', userId)
        .single();
      return data?.public_wallet_address?.toLowerCase() || null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const checkTransfers = useCallback(async () => {
    if (!walletAddress || !userId) return;

    const toAddressPadded = '0x' + walletAddress.slice(2).padStart(64, '0');

    try {
      // Get current block numbers
      const [mainnetBlock, testnetBlock] = await Promise.all([
        getBlockNumber(BSC_RPCS, mainnetRpcIdx).catch(() => 0),
        getBlockNumber(BSC_TESTNET_RPCS, testnetRpcIdx).catch(() => 0),
      ]);

      if (mainnetBlock === 0 && testnetBlock === 0) return;

      const mainnetFrom = lastBlockMainnet.current || (mainnetBlock - BLOCKS_LOOKBACK);
      const testnetFrom = lastBlockTestnet.current || (testnetBlock - BLOCKS_LOOKBACK);

      // Query each contract separately to avoid rate limits
      const logPromises: Promise<TransferLog[]>[] = [];

      if (mainnetBlock > mainnetFrom) {
        for (const contract of WATCHED_CONTRACTS.mainnet) {
          logPromises.push(
            getLogsForContract(BSC_RPCS, mainnetRpcIdx, contract, toAddressPadded, mainnetFrom + 1, mainnetBlock)
          );
        }
      }

      if (testnetBlock > testnetFrom) {
        for (const contract of WATCHED_CONTRACTS.testnet) {
          logPromises.push(
            getLogsForContract(BSC_TESTNET_RPCS, testnetRpcIdx, contract, toAddressPadded, testnetFrom + 1, testnetBlock)
          );
        }
      }

      const logResults = await Promise.all(logPromises);

      lastBlockMainnet.current = mainnetBlock || lastBlockMainnet.current;
      lastBlockTestnet.current = testnetBlock || lastBlockTestnet.current;

      // Determine chain_id per result: first N are mainnet, rest testnet
      const mainnetContractCount = mainnetBlock > mainnetFrom ? WATCHED_CONTRACTS.mainnet.length : 0;
      const allLogs: (TransferLog & { chainId: number })[] = [];
      
      logResults.forEach((logs, idx) => {
        const chainId = idx < mainnetContractCount ? 56 : 97;
        for (const l of logs) {
          allLogs.push({ ...l, chainId });
        }
      });

      for (const log of allLogs) {
        const txHash = log.transactionHash;
        if (!txHash || processedTxs.current.has(txHash)) continue;
        processedTxs.current.add(txHash);

        // Call edge function to record
        try {
          const { data: session } = await supabase.auth.getSession();
          if (!session?.session?.access_token) continue;

          const res = await supabase.functions.invoke('record-instant-donation', {
            body: { tx_hash: txHash, chain_id: log.chainId },
          });

          if (res.data?.status === 'recorded') {
            toast({
              title: '🎁 Nhận quà tặng!',
              description: `${res.data.sender} đã tặng bạn ${res.data.amount} ${res.data.token}`,
            });

            // Invalidate caches
            queryClient.invalidateQueries({ queryKey: ['highlighted-posts'] });
            queryClient.invalidateQueries({ queryKey: ['gift-day-counts'] });
            queryClient.invalidateQueries({ queryKey: ['donation-count-by-date'] });
            queryClient.invalidateQueries({ queryKey: ['public-donation-history'] });
          }
        } catch (err) {
          console.warn('[TransferDetector] Failed to record tx:', txHash, err);
        }
      }
    } catch (err) {
      // Silent fail - polling will retry
      console.warn('[TransferDetector] Poll error:', err);
    }
  }, [walletAddress, userId, toast, queryClient]);

  useEffect(() => {
    if (!walletAddress || !userId) return;

    // Initial check
    checkTransfers();

    const interval = setInterval(checkTransfers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [walletAddress, userId, checkTransfers]);
}
