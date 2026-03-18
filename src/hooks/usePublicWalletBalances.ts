import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { bsc } from 'viem/chains';
import { TOKEN_CONTRACTS } from './useTokenBalances';

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const TOKEN_DECIMALS: Record<string, number> = {
  USDT: 18,
  BTCB: 18,
  CAMLY: 18,
  FUN: 18,
  BNB: 18,
};

export interface PublicBalances {
  [symbol: string]: number;
}

const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org'),
});

export function usePublicWalletBalances(walletAddress: string | undefined) {
  const [balances, setBalances] = useState<PublicBalances>({});
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress || !walletAddress.startsWith('0x')) return;
    setLoading(true);
    try {
      const addr = walletAddress as `0x${string}`;

      const [bnbBalance, usdtBalance, btcbBalance, camlyBalance, funBalance] = await Promise.all([
        client.getBalance({ address: addr }),
        client.readContract({ address: TOKEN_CONTRACTS.USDT, abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [addr] }),
        client.readContract({ address: TOKEN_CONTRACTS.BTCB, abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [addr] }),
        client.readContract({ address: TOKEN_CONTRACTS.CAMLY, abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [addr] }),
        client.readContract({ address: TOKEN_CONTRACTS.FUN, abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [addr] }),
      ]);

      setBalances({
        BNB: Number(formatUnits(bnbBalance, 18)),
        USDT: Number(formatUnits(usdtBalance as bigint, 18)),
        BTCB: Number(formatUnits(btcbBalance as bigint, 18)),
        CAMLY: Number(formatUnits(camlyBalance as bigint, 18)),
        FUN: Number(formatUnits(funBalance as bigint, 18)),
      });
    } catch (err) {
      console.error('Failed to fetch on-chain balances:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, refetch: fetchBalances };
}
