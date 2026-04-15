import { useMemo, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { bsc, mainnet, polygon } from 'wagmi/chains';
import { useReadContract } from 'wagmi';
import { useTokenPrices, FALLBACK_PRICES, type PriceData } from './useTokenPrices';

// Token logos
import bnbLogo from '@/assets/tokens/bnb-logo.webp';
import usdtLogo from '@/assets/tokens/usdt-logo.webp';
import btcbLogo from '@/assets/tokens/btcb-logo.png';
import camlyLogo from '@/assets/tokens/camly-logo.webp';
import funLogo from '@/assets/tokens/fun-logo.png';
import ethLogo from '@/assets/tokens/eth-logo.png';
import maticLogo from '@/assets/tokens/matic-logo.png';

// Token contract addresses on BSC
export const TOKEN_CONTRACTS = {
  USDT: '0x55d398326f99059fF775485246999027B3197955' as `0x${string}`,
  BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c' as `0x${string}`,
  CAMLY: '0x0910320181889feFDE0BB1Ca63962b0A8882e413' as `0x${string}`,
  FUN: '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6' as `0x${string}`,
};

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

interface UseTokenBalancesOptions {
  customAddress?: `0x${string}` | null;
}

export const useTokenBalances = (options?: UseTokenBalancesOptions) => {
  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const { data: prices = FALLBACK_PRICES, isLoading: isPriceLoading } = useTokenPrices();

  const address = options?.customAddress || connectedAddress;
  const activeChainId = chainId || bsc.id;

  const isBsc = activeChainId === bsc.id || activeChainId === 97;
  const isMainnet = activeChainId === mainnet.id;
  const isPolygon = activeChainId === polygon.id;

  // ── Native balances ──
  const { data: nativeBalance, refetch: refetchNative, isLoading: isNativeLoading } = useBalance({
    address,
    chainId: activeChainId,
  });

  // ── BSC ERC-20 balances ──
  const { data: usdtBalance, refetch: refetchUsdt, isLoading: isUsdtLoading } = useReadContract({
    address: TOKEN_CONTRACTS.USDT,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: activeChainId,
    query: { enabled: isBsc },
  });

  const { data: btcbBalance, refetch: refetchBtcb, isLoading: isBtcbLoading } = useReadContract({
    address: TOKEN_CONTRACTS.BTCB,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: activeChainId,
    query: { enabled: isBsc },
  });

  const { data: camlyBalance, refetch: refetchCamly, isLoading: isCamlyLoading } = useReadContract({
    address: TOKEN_CONTRACTS.CAMLY,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: activeChainId,
    query: { enabled: isBsc },
  });

  const { data: funBalance, refetch: refetchFun, isLoading: isFunLoading } = useReadContract({
    address: TOKEN_CONTRACTS.FUN,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: activeChainId,
    query: { enabled: isBsc },
  });

  // ── Parse balances ──
  const parseBalance = (value: bigint | undefined, decimals: number): number => {
    if (!value) return 0;
    return parseFloat(formatUnits(value, decimals));
  };

  const nativeAmount = nativeBalance ? parseFloat(nativeBalance.formatted) : 0;
  const usdtAmount = parseBalance(usdtBalance as bigint | undefined, 18);
  const btcbAmount = parseBalance(btcbBalance as bigint | undefined, 18);
  const camlyAmount = parseBalance(camlyBalance as bigint | undefined, 3);
  const funAmount = parseBalance(funBalance as bigint | undefined, 18);

  // ── Build chain-aware tokens array ──
  const tokens: TokenBalance[] = useMemo(() => {
    const result: TokenBalance[] = [];

    if (isMainnet) {
      result.push({
        symbol: 'ETH', name: 'Ethereum', icon: ethLogo, balance: nativeAmount,
        price: prices.ETH?.usd || 3500, usdValue: nativeAmount * (prices.ETH?.usd || 3500),
        change24h: prices.ETH?.usd_24h_change || 0, isLoading: isNativeLoading || isPriceLoading, decimals: 18,
      });
    } else if (isPolygon) {
      result.push({
        symbol: 'POL', name: 'Polygon', icon: maticLogo, balance: nativeAmount,
        price: prices.POL?.usd || prices.MATIC?.usd || 0.5,
        usdValue: nativeAmount * (prices.POL?.usd || prices.MATIC?.usd || 0.5),
        change24h: prices.POL?.usd_24h_change || prices.MATIC?.usd_24h_change || 0,
        isLoading: isNativeLoading || isPriceLoading, decimals: 18,
      });
    } else {
      // BSC (default)
      result.push(
        { symbol: 'BNB', name: 'BNB', icon: bnbLogo, balance: nativeAmount, price: prices.BNB?.usd || 700, usdValue: nativeAmount * (prices.BNB?.usd || 700), change24h: prices.BNB?.usd_24h_change || 0, isLoading: isNativeLoading || isPriceLoading, decimals: 18 },
        { symbol: 'USDT', name: 'Tether USD', icon: usdtLogo, balance: usdtAmount, price: prices.USDT?.usd || 1, usdValue: usdtAmount * (prices.USDT?.usd || 1), change24h: prices.USDT?.usd_24h_change || 0, isLoading: isUsdtLoading || isPriceLoading, contractAddress: TOKEN_CONTRACTS.USDT, decimals: 18 },
        { symbol: 'BTCB', name: 'Bitcoin BEP20', icon: btcbLogo, balance: btcbAmount, price: prices.BTCB?.usd || 100000, usdValue: btcbAmount * (prices.BTCB?.usd || 100000), change24h: prices.BTCB?.usd_24h_change || 0, isLoading: isBtcbLoading || isPriceLoading, contractAddress: TOKEN_CONTRACTS.BTCB, decimals: 18 },
        { symbol: 'CAMLY', name: 'Camly Coin', icon: camlyLogo, balance: camlyAmount, price: prices.CAMLY?.usd || 0.000014, usdValue: camlyAmount * (prices.CAMLY?.usd || 0.000014), change24h: prices.CAMLY?.usd_24h_change || 0, isLoading: isCamlyLoading || isPriceLoading, contractAddress: TOKEN_CONTRACTS.CAMLY, decimals: 3 },
        { symbol: 'FUN', name: 'FUN Money', icon: funLogo, balance: funAmount, price: 0, usdValue: 0, change24h: 0, isLoading: isFunLoading || isPriceLoading, contractAddress: TOKEN_CONTRACTS.FUN, decimals: 18 },
      );
    }

    return result;
  }, [isMainnet, isPolygon, nativeAmount, usdtAmount, btcbAmount, camlyAmount, funAmount, prices, isNativeLoading, isUsdtLoading, isBtcbLoading, isCamlyLoading, isFunLoading, isPriceLoading]);

  const totalUsdValue = tokens.reduce((sum, token) => sum + token.usdValue, 0);
  const isLoading = isNativeLoading || (isBsc && (isUsdtLoading || isBtcbLoading || isCamlyLoading || isFunLoading)) || isPriceLoading;

  const refetch = useCallback(() => {
    refetchNative();
    if (isBsc) {
      refetchUsdt();
      refetchBtcb();
      refetchCamly();
      refetchFun();
    }
  }, [refetchNative, refetchUsdt, refetchBtcb, refetchCamly, refetchFun, isBsc]);

  return {
    tokens,
    totalUsdValue,
    isLoading,
    refetch,
    prices,
    isConnected,
  };
};
