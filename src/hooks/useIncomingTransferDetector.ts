/**
 * useIncomingTransferDetector
 * 
 * Polls BSC RPC every 15 seconds for ERC20 Transfer events TO the current user's wallet.
 * When a new transfer is detected, calls record-instant-donation to create
 * donation + post + notification + chat message instantly (~15s latency).
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BSC_RPC = 'https://bsc-dataseed1.binance.org';
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';

// ERC20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Known token contracts to watch
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

const POLL_INTERVAL = 15_000; // 15 seconds
const BLOCKS_LOOKBACK = 5; // ~15 seconds on BSC (3s/block)

interface TransferLog {
  transactionHash: string;
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
}

async function getBlockNumber(rpcUrl: string): Promise<number> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
  });
  const json = await res.json();
  return parseInt(json.result, 16);
}

async function getLogs(
  rpcUrl: string,
  contracts: string[],
  toAddressPadded: string,
  fromBlock: number,
  toBlock: number
): Promise<TransferLog[]> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getLogs',
      params: [{
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: '0x' + toBlock.toString(16),
        address: contracts,
        topics: [TRANSFER_TOPIC, null, toAddressPadded],
      }],
    }),
  });
  const json = await res.json();
  if (json.error) return [];
  return json.result || [];
}

export function useIncomingTransferDetector() {
  const { userId } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const processedTxs = useRef(new Set<string>());
  const lastBlockMainnet = useRef(0);
  const lastBlockTestnet = useRef(0);

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
        getBlockNumber(BSC_RPC),
        getBlockNumber(BSC_TESTNET_RPC).catch(() => 0),
      ]);

      const mainnetFrom = lastBlockMainnet.current || (mainnetBlock - BLOCKS_LOOKBACK);
      const testnetFrom = lastBlockTestnet.current || (testnetBlock - BLOCKS_LOOKBACK);

      // Fetch logs in parallel
      const [mainnetLogs, testnetLogs] = await Promise.all([
        mainnetBlock > mainnetFrom
          ? getLogs(BSC_RPC, WATCHED_CONTRACTS.mainnet, toAddressPadded, mainnetFrom + 1, mainnetBlock)
          : Promise.resolve([]),
        testnetBlock > testnetFrom
          ? getLogs(BSC_TESTNET_RPC, WATCHED_CONTRACTS.testnet, toAddressPadded, testnetFrom + 1, testnetBlock)
          : Promise.resolve([]),
      ]);

      lastBlockMainnet.current = mainnetBlock;
      lastBlockTestnet.current = testnetBlock;

      // Process new transfers
      const allLogs = [
        ...mainnetLogs.map(l => ({ ...l, chainId: 56 })),
        ...testnetLogs.map(l => ({ ...l, chainId: 97 })),
      ];

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
