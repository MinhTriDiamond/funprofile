import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { FUN_MONEY_CONTRACT, FUN_MONEY_ABI, fromWei } from '@/config/pplp';

export interface FunBalances {
  total: number;
  locked: number;
  activated: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useFunBalance = (customAddress?: `0x${string}`): FunBalances => {
  const { address: connectedAddress } = useAccount();
  const address = customAddress || connectedAddress;
  
  const [balances, setBalances] = useState<Omit<FunBalances, 'isLoading' | 'error' | 'refetch'>>({
    total: 0,
    locked: 0,
    activated: 0,
  });

  // Read total balance
  const { 
    data: totalWei, 
    isLoading: isLoadingTotal, 
    error: errorTotal,
    refetch: refetchTotal 
  } = useReadContract({
    address: FUN_MONEY_CONTRACT.address,
    abi: FUN_MONEY_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: FUN_MONEY_CONTRACT.chainId,
    query: {
      enabled: !!address,
      refetchInterval: 30000,
    },
  });

  // Read locked balance
  const { 
    data: lockedWei, 
    isLoading: isLoadingLocked, 
    error: errorLocked,
    refetch: refetchLocked 
  } = useReadContract({
    address: FUN_MONEY_CONTRACT.address,
    abi: FUN_MONEY_ABI,
    functionName: 'lockedBalanceOf',
    args: address ? [address] : undefined,
    chainId: FUN_MONEY_CONTRACT.chainId,
    query: {
      enabled: !!address,
      refetchInterval: 30000,
    },
  });

  useEffect(() => {
    const total = totalWei ? fromWei(totalWei as bigint) : 0;
    const locked = lockedWei ? fromWei(lockedWei as bigint) : 0;
    const activated = Math.max(0, total - locked);
    
    setBalances({ total, locked, activated });
  }, [totalWei, lockedWei]);

  const handleRefetch = useCallback(() => {
    refetchTotal();
    refetchLocked();
  }, [refetchTotal, refetchLocked]);

  const isLoading = isLoadingTotal || isLoadingLocked;
  const error = errorTotal || errorLocked;

  return {
    ...balances,
    isLoading,
    error: error as Error | null,
    refetch: handleRefetch,
  };
};
