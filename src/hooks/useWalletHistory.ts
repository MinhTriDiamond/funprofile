import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WalletTx {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  functionName: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
  tokenName?: string;
  _network: 'mainnet' | 'testnet';
  _chainId: number;
}

export type TxFilter = 'all' | 'receive' | 'send';

interface WalletHistoryState {
  transactions: WalletTx[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

export function useWalletHistory(walletAddress: string | undefined) {
  const [state, setState] = useState<WalletHistoryState>({
    transactions: [],
    loading: false,
    error: null,
    page: 1,
    hasMore: true,
  });

  const [filter, setFilter] = useState<TxFilter>('all');
  const [action, setAction] = useState<'txlist' | 'tokentx'>('txlist');

  const fetchHistory = useCallback(async (page = 1, txAction: 'txlist' | 'tokentx' = action) => {
    if (!walletAddress) return;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('fetch-wallet-history', {
        body: {
          address: walletAddress,
          page,
          offset: PAGE_SIZE,
          sort: 'desc',
          action: txAction,
          network: 'both',
        },
      });

      if (error) throw error;

      const txs: WalletTx[] = data?.result || [];
      setState(prev => ({
        ...prev,
        transactions: page === 1 ? txs : [...prev.transactions, ...txs],
        page,
        hasMore: txs.length >= PAGE_SIZE,
        loading: false,
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message || 'Failed to fetch', loading: false }));
    }
  }, [walletAddress, action]);

  const loadMore = useCallback(() => {
    fetchHistory(state.page + 1);
  }, [fetchHistory, state.page]);

  const changeAction = useCallback((a: 'txlist' | 'tokentx') => {
    setAction(a);
    fetchHistory(1, a);
  }, [fetchHistory]);

  const getFilteredTxs = useCallback(() => {
    if (!walletAddress) return [];
    const addr = walletAddress.toLowerCase();
    return state.transactions.filter(tx => {
      if (filter === 'receive') return tx.to.toLowerCase() === addr;
      if (filter === 'send') return tx.from.toLowerCase() === addr;
      return true;
    });
  }, [state.transactions, filter, walletAddress]);

  const getSummary = useCallback(() => {
    if (!walletAddress) return { totalReceived: 0, totalSent: 0, count: 0 };
    const addr = walletAddress.toLowerCase();
    let totalReceived = 0;
    let totalSent = 0;
    for (const tx of state.transactions) {
      const val = Number(tx.value) / 1e18;
      if (tx.to.toLowerCase() === addr) totalReceived += val;
      if (tx.from.toLowerCase() === addr) totalSent += val;
    }
    return { totalReceived, totalSent, count: state.transactions.length };
  }, [state.transactions, walletAddress]);

  return {
    ...state,
    filter,
    setFilter,
    action,
    changeAction,
    fetchHistory,
    loadMore,
    getFilteredTxs,
    getSummary,
  };
}
