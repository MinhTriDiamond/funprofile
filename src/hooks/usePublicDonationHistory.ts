import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DonationFilter = 'all' | 'sent' | 'received' | 'swap' | 'transfer';

export interface DonationRecord {
  id: string;
  amount: string;
  token_symbol: string;
  tx_hash: string;
  status: string;
  message: string | null;
  created_at: string;
  chain_id: number;
  sender_id: string | null;
  recipient_id: string | null;
  sender_username: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  recipient_username: string | null;
  recipient_display_name: string | null;
  recipient_avatar_url: string | null;
  type: 'donation' | 'swap' | 'transfer';
  // swap-specific
  from_symbol?: string;
  to_symbol?: string;
  from_amount?: number;
  to_amount?: number;
  // transfer-specific
  direction?: 'in' | 'out';
  counterparty_address?: string;
}

interface TokenBreakdown {
  [symbol: string]: { amount: number; count: number };
}

export interface DonationSummary {
  received: TokenBreakdown;
  sent: TokenBreakdown;
  receivedCount: number;
  sentCount: number;
  totalCount: number;
}

const PAGE_SIZE = 20;

export function usePublicDonationHistory(userId: string | undefined) {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DonationFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [summary, setSummary] = useState<DonationSummary>({ received: {}, sent: {}, receivedCount: 0, sentCount: 0, totalCount: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!userId) return;
    setSummaryLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_user_donation_summary', { p_user_id: userId });
      if (rpcError) throw rpcError;

      const raw = data as any;
      const received: TokenBreakdown = {};
      const sent: TokenBreakdown = {};
      let receivedCount = 0;
      let sentCount = 0;

      if (raw?.received) {
        for (const [sym, val] of Object.entries(raw.received as Record<string, any>)) {
          received[sym] = { amount: Number(val.amount) || 0, count: Number(val.count) || 0 };
          receivedCount += received[sym].count;
        }
      }
      if (raw?.sent) {
        for (const [sym, val] of Object.entries(raw.sent as Record<string, any>)) {
          sent[sym] = { amount: Number(val.amount) || 0, count: Number(val.count) || 0 };
          sentCount += sent[sym].count;
        }
      }

      setSummary({ received, sent, receivedCount, sentCount, totalCount: receivedCount + sentCount });
    } catch (err: any) {
      console.error('fetchSummary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [userId]);

  const fetchDonations = useCallback(async (pageNum = 1, currentFilter: DonationFilter = filter) => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = pageNum * PAGE_SIZE - 1;

      // Fetch swap records
      let swapRecords: DonationRecord[] = [];
      if (currentFilter === 'all' || currentFilter === 'swap') {
        const { data: swapData, error: swapError } = await supabase
          .from('swap_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);
        
        if (!swapError && swapData) {
          swapRecords = swapData.map((s: any) => ({
            id: `swap-${s.id}`,
            amount: String(s.from_amount),
            token_symbol: s.from_symbol,
            tx_hash: s.tx_hash,
            status: s.status,
            message: null,
            created_at: s.created_at,
            chain_id: s.chain_id,
            sender_id: s.user_id,
            recipient_id: s.user_id,
            sender_username: null,
            sender_display_name: null,
            sender_avatar_url: null,
            recipient_username: null,
            recipient_display_name: null,
            recipient_avatar_url: null,
            type: 'swap' as const,
            from_symbol: s.from_symbol,
            to_symbol: s.to_symbol,
            from_amount: Number(s.from_amount),
            to_amount: Number(s.to_amount),
          }));
        }
      }

      // Fetch wallet transfer records
      let transferRecords: DonationRecord[] = [];
      if (currentFilter === 'all' || currentFilter === 'transfer') {
        const { data: transferData, error: transferError } = await supabase
          .from('wallet_transfers')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (!transferError && transferData) {
          transferRecords = transferData.map((t: any) => ({
            id: `transfer-${t.id}`,
            amount: String(t.amount),
            token_symbol: t.token_symbol,
            tx_hash: t.tx_hash,
            status: t.status,
            message: null,
            created_at: t.created_at,
            chain_id: t.chain_id,
            sender_id: t.direction === 'out' ? t.user_id : null,
            recipient_id: t.direction === 'in' ? t.user_id : null,
            sender_username: null,
            sender_display_name: null,
            sender_avatar_url: null,
            recipient_username: null,
            recipient_display_name: null,
            recipient_avatar_url: null,
            type: 'transfer' as const,
            direction: t.direction as 'in' | 'out',
            counterparty_address: t.counterparty_address,
          }));
        }
      }

      // Fetch donation records
      let donationRecords: DonationRecord[] = [];
      if (currentFilter !== 'swap' && currentFilter !== 'transfer') {
        let query = supabase
          .from('donations')
          .select(`
            id, amount, token_symbol, tx_hash, status, message, created_at, chain_id,
            sender_id, recipient_id,
            sender:profiles!donations_sender_id_fkey(username, display_name, avatar_url),
            recipient:profiles!donations_recipient_id_fkey(username, display_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (currentFilter === 'sent') {
          query = query.eq('sender_id', userId);
        } else if (currentFilter === 'received') {
          query = query.eq('recipient_id', userId);
        } else {
          query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
        }

        const { data, error: queryError } = await query;
        if (queryError) throw queryError;

        donationRecords = (data || []).map((d: any) => ({
          id: d.id,
          amount: d.amount,
          token_symbol: d.token_symbol,
          tx_hash: d.tx_hash,
          status: d.status,
          message: d.message,
          created_at: d.created_at,
          chain_id: d.chain_id,
          sender_id: d.sender_id,
          recipient_id: d.recipient_id,
          sender_username: d.sender?.username || null,
          sender_display_name: d.sender?.display_name || null,
          sender_avatar_url: d.sender?.avatar_url || null,
          recipient_username: d.recipient?.username || null,
          recipient_display_name: d.recipient?.display_name || null,
          recipient_avatar_url: d.recipient?.avatar_url || null,
          type: 'donation' as const,
        }));
      }

      // Merge and sort
      const merged = [...donationRecords, ...swapRecords, ...transferRecords]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, PAGE_SIZE);

      setDonations(prev => pageNum === 1 ? merged : [...prev, ...merged]);
      setPage(pageNum);
      setHasMore(merged.length >= PAGE_SIZE);
    } catch (err: any) {
      console.error('fetchDonations error:', err);
      setError(err.message || 'Không thể tải lịch sử');
    } finally {
      setLoading(false);
    }
  }, [userId, filter]);

  const loadMore = useCallback(() => {
    fetchDonations(page + 1, filter);
  }, [fetchDonations, page, filter]);

  const changeFilter = useCallback((f: DonationFilter) => {
    setFilter(f);
    setDonations([]);
    fetchDonations(1, f);
  }, [fetchDonations]);

  return {
    donations,
    loading,
    error,
    filter,
    hasMore,
    summary,
    summaryLoading,
    changeFilter,
    fetchDonations,
    fetchSummary,
    loadMore,
  };
}
