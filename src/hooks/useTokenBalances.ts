import { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { bsc } from 'wagmi/chains';
import { useReadContract } from 'wagmi';

// Token logos
import bnbLogo from '@/assets/tokens/bnb-logo.webp';
import usdtLogo from '@/assets/tokens/usdt-logo.webp';
import btcbLogo from '@/assets/tokens/btcb-logo.webp';
import camlyLogo from '@/assets/tokens/camly-logo.webp';
import funLogo from '@/assets/tokens/fun-logo.png';

// Token contract addresses on BSC
export const TOKEN_CONTRACTS = {
  USDT: '0x55d398326f99059fF775485246999027B3197955' as `0x${string}`,
  BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c' as `0x${string}`,
  CAMLY: '0x0910320181889feFDE0BB1Ca63962b0A8882e413' as `0x${string}`,
  FUN: '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6' as `0x${string}`,
};

import { supabase } from '@/integrations/supabase/client';

// ERC20 ABI for balanceOf
const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export interface TokenBalance {
  symbol: string;
  name: string;
  icon: string;
  balance: number;
  price: number;
  usdValue: number;
  change24h: number;
  isLoading: boolean;
  contractAddress?: string;
  decimals: number;
}

interface PriceData {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

interface UseTokenBalancesOptions {
  customAddress?: `0x${string}` | null;
}

export const useTokenBalances = (options?: UseTokenBalancesOptions) => {
  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const [prices, setPrices] = useState<PriceData>({});
  const [isPriceLoading, setIsPriceLoading] = useState(true);
  const [lastPrices, setLastPrices] = useState<PriceData>({});

  // Use custom address if provided, otherwise use connected wallet address
  const address = options?.customAddress || connectedAddress;
  
  // Use current chainId or default to BSC mainnet
  const activeChainId = chainId || bsc.id;

  // Native BNB balance
  const { data: bnbBalance, refetch: refetchBnb, isLoading: isBnbLoading } = useBalance({
    address,
    chainId: activeChainId,
  });

  // USDT balance
  const { data: usdtBalance, refetch: refetchUsdt, isLoading: isUsdtLoading } = useReadContract({
    address: TOKEN_CONTRACTS.USDT,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: activeChainId,
  });

  // BTCB balance
  const { data: btcbBalance, refetch: refetchBtcb, isLoading: isBtcbLoading } = useReadContract({
    address: TOKEN_CONTRACTS.BTCB,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: activeChainId,
  });

  // CAMLY balance (3 decimals)
  const { data: camlyBalance, refetch: refetchCamly, isLoading: isCamlyLoading } = useReadContract({
    address: TOKEN_CONTRACTS.CAMLY,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: activeChainId,
  });

  // FUN token balance (on current chain - mainly BSC Testnet)
  const { data: funBalance, refetch: refetchFun, isLoading: isFunLoading } = useReadContract({
    address: TOKEN_CONTRACTS.FUN,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: activeChainId,
  });

  // Fallback prices used when no wallet is connected or on error
  const fallbackPrices: PriceData = {
    BNB: { usd: 700, usd_24h_change: 0 },
    BTCB: { usd: 100000, usd_24h_change: 0 },
    USDT: { usd: 1, usd_24h_change: 0 },
    CAMLY: { usd: 0.000014, usd_24h_change: 0 },
  };

  const CACHE_KEY = 'fun_token_prices';
  const CACHE_TTL = 60_000; // 60s localStorage cache
  const POLL_INTERVAL = 300_000; // 5 minutes

  // Track consecutive failures for backoff
  const [failCount, setFailCount] = useState(0);

  // Fetch prices from token-prices edge function
  const fetchPrices = useCallback(async () => {
    // Check localStorage cache first to avoid redundant calls
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { prices: cached, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL && cached) {
          setPrices(cached);
          setLastPrices(cached);
          setIsPriceLoading(false);
          return;
        }
      }
    } catch { /* ignore parse errors */ }

    try {
      setIsPriceLoading(true);
      const { data, error } = await supabase.functions.invoke('token-prices');
      
      if (error) throw error;
      
      const priceData: PriceData = data?.prices || fallbackPrices;
      
      // Write to localStorage so other hooks can share
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ prices: priceData, ts: Date.now() }));
      } catch { /* quota exceeded */ }

      setPrices(priceData);
      setLastPrices(priceData);
      setFailCount(0);
      setIsPriceLoading(false);
    } catch (error) {
      console.error('Error fetching prices:', error);
      if (Object.keys(lastPrices).length > 0) {
        setPrices(lastPrices);
      } else {
        setPrices(fallbackPrices);
      }
      setFailCount(prev => prev + 1);
      setIsPriceLoading(false);
    }
  }, [lastPrices]);

  // Always fetch prices (even without wallet connected) for accurate display
  useEffect(() => {
    if (failCount >= 3) return; // Stop retrying after 3 failures

    fetchPrices();
    const interval = setInterval(fetchPrices, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [failCount]);

  // Parse token balances
  const parseBalance = (value: bigint | undefined, decimals: number): number => {
    if (!value) return 0;
    return parseFloat(formatUnits(value, decimals));
  };

  // Calculate balances
  const bnbAmount = bnbBalance ? parseFloat(bnbBalance.formatted) : 0;
  const usdtAmount = parseBalance(usdtBalance as bigint | undefined, 18);
  const btcbAmount = parseBalance(btcbBalance as bigint | undefined, 18);
  const camlyAmount = parseBalance(camlyBalance as bigint | undefined, 3);
  const funAmount = parseBalance(funBalance as bigint | undefined, 18);

  // Build tokens array with real data
  const tokens: TokenBalance[] = [
    {
      symbol: 'BNB',
      name: 'BNB',
      icon: bnbLogo,
      balance: bnbAmount,
      price: prices.BNB?.usd || 700,
      usdValue: bnbAmount * (prices.BNB?.usd || 700),
      change24h: prices.BNB?.usd_24h_change || 0,
      isLoading: isBnbLoading || isPriceLoading,
      decimals: 18,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      icon: usdtLogo,
      balance: usdtAmount,
      price: prices.USDT?.usd || 1,
      usdValue: usdtAmount * (prices.USDT?.usd || 1),
      change24h: prices.USDT?.usd_24h_change || 0,
      isLoading: isUsdtLoading || isPriceLoading,
      contractAddress: TOKEN_CONTRACTS.USDT,
      decimals: 18,
    },
    {
      symbol: 'BTCB',
      name: 'Bitcoin BEP20',
      icon: btcbLogo,
      balance: btcbAmount,
      price: prices.BTCB?.usd || 100000,
      usdValue: btcbAmount * (prices.BTCB?.usd || 100000),
      change24h: prices.BTCB?.usd_24h_change || 0,
      isLoading: isBtcbLoading || isPriceLoading,
      contractAddress: TOKEN_CONTRACTS.BTCB,
      decimals: 18,
    },
    {
      symbol: 'CAMLY',
      name: 'Camly Coin',
      icon: camlyLogo,
      balance: camlyAmount,
      price: prices.CAMLY?.usd || 0.000014,
      usdValue: camlyAmount * (prices.CAMLY?.usd || 0.000014),
      change24h: prices.CAMLY?.usd_24h_change || 0,
      isLoading: isCamlyLoading || isPriceLoading,
      contractAddress: TOKEN_CONTRACTS.CAMLY,
      decimals: 3,
    },
    {
      symbol: 'FUN',
      name: 'FUN Money',
      icon: funLogo,
      balance: funAmount,
      price: 0, // FUN has no market price yet
      usdValue: 0,
      change24h: 0,
      isLoading: isFunLoading || isPriceLoading,
      contractAddress: TOKEN_CONTRACTS.FUN,
      decimals: 18,
    },
  ];

  const totalUsdValue = tokens.reduce((sum, token) => sum + token.usdValue, 0);
  const isLoading = isBnbLoading || isUsdtLoading || isBtcbLoading || isCamlyLoading || isFunLoading || isPriceLoading;

  const refetch = useCallback(() => {
    refetchBnb();
    refetchUsdt();
    refetchBtcb();
    refetchCamly();
    refetchFun();
    fetchPrices();
  }, [refetchBnb, refetchUsdt, refetchBtcb, refetchCamly, refetchFun, fetchPrices]);

  return {
    tokens,
    totalUsdValue,
    isLoading,
    refetch,
    prices,
    isConnected,
  };
};
