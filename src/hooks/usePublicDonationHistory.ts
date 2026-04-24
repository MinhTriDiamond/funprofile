import { useState, useCallback, useEffect, useRef } from 'react';
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
  is_external?: boolean;
  sender_address?: string | null;
  from_symbol?: string;
  to_symbol?: string;
  from_amount?: number;
  to_amount?: number;
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

const PAGE_SIZE = 200;

export function usePublicDonationHistory(userId: string | undefined, userCreatedAt?: string | null) {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DonationFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [summary, setSummary] = useState<DonationSummary>({ received: {}, sent: {}, receivedCount: 0, sentCount: 0, totalCount: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const computeSummaryFromDonations = useCallback((records: DonationRecord[]) => {
    const received: TokenBreakdown = {};
    const sent: TokenBreakdown = {};
    let receivedCount = 0;
    let sentCount = 0;

    for (const d of records) {
      if (d.type === 'swap') {
        // swap FROM = sent, swap TO = received
        const fromSym = d.from_symbol || d.token_symbol;
        const toSym = d.to_symbol || d.token_symbol;
        if (fromSym) {
          if (!sent[fromSym]) sent[fromSym] = { amount: 0, count: 0 };
          sent[fromSym].amount += Number(d.from_amount || d.amount) || 0;
          sent[fromSym].count += 1;
          sentCount++;
        }
        if (toSym) {
          if (!received[toSym]) received[toSym] = { amount: 0, count: 0 };
          received[toSym].amount += Number(d.to_amount || 0);
          received[toSym].count += 1;
          receivedCount++;
        }
      } else if (d.type === 'transfer') {
        const sym = d.token_symbol;
        if (d.direction === 'in') {
          if (!received[sym]) received[sym] = { amount: 0, count: 0 };
          received[sym].amount += Number(d.amount) || 0;
          received[sym].count += 1;
          receivedCount++;
        } else {
          if (!sent[sym]) sent[sym] = { amount: 0, count: 0 };
          sent[sym].amount += Number(d.amount) || 0;
          sent[sym].count += 1;
          sentCount++;
        }
      } else {
        // donation
        const sym = d.token_symbol;
        const amt = Number(d.amount) || 0;
        const isSent = d.sender_id === userId;
        if (isSent) {
          if (!sent[sym]) sent[sym] = { amount: 0, count: 0 };
          sent[sym].amount += amt;
          sent[sym].count += 1;
          sentCount++;
        } else {
          if (!received[sym]) received[sym] = { amount: 0, count: 0 };
          received[sym].amount += amt;
          received[sym].count += 1;
          receivedCount++;
        }
      }
    }

    return { received, sent, receivedCount, sentCount, totalCount: receivedCount + sentCount };
  }, [userId]);

  const updateSummaryFromDonations = useCallback((records: DonationRecord[]) => {
    const computed = computeSummaryFromDonations(records);
    setSummary(computed);
  }, [computeSummaryFromDonations]);

  const fetchSummary = useCallback(async (fromDate?: string | null, toDate?: string | null) => {
    if (!userId) return;
    
    // If date range is active, skip RPC — summary will be computed client-side after fetchDonations
    if (fromDate || toDate) return;
    
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

  const fetchDonations = useCallback(async (pageNum = 1, currentFilter: DonationFilter = filter, fromDate?: string | null, toDate?: string | null) => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = pageNum * PAGE_SIZE - 1;

      const needDonations = currentFilter === 'all' || currentFilter === 'sent' || currentFilter === 'received';
      const needSwaps = currentFilter === 'all' || currentFilter === 'swap' || currentFilter === 'sent' || currentFilter === 'received';
      const needTransfers = currentFilter === 'all' || currentFilter === 'transfer' || currentFilter === 'sent' || currentFilter === 'received';

      // NOTE: KHÔNG dùng userCreatedAt làm filter cứng vì giao dịch on-chain
      // có thể được ghi nhận trễ hoặc backfill với timestamp cũ hơn ngày tạo profile.
      // Filter này từng làm mất 7 lệnh CAMLY của user Trần Hải.

      // Swap records
      let swapRecords: DonationRecord[] = [];
      if (needSwaps) {
        let swapQuery = supabase
          .from('swap_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (fromDate) swapQuery = swapQuery.gte('created_at', fromDate);

    } catch (err: any) {
      console.error('fetchDonations error:', err);
      setError(err.message || 'Không thể tải lịch sử');
    } finally {
      setLoading(false);
    }
  }, [userId, userCreatedAt, filter, computeSummaryFromDonations]);

  const loadMore = useCallback(() => {
    fetchDonations(page + 1, filter, dateFrom, dateTo);
  }, [fetchDonations, page, filter, dateFrom, dateTo]);

  const changeFilter = useCallback((f: DonationFilter) => {
    setFilter(f);
    setDonations([]);
    fetchDonations(1, f, dateFrom, dateTo);
  }, [fetchDonations, dateFrom, dateTo]);

  const changeDateRange = useCallback((from: string | null, to: string | null) => {
    setDateFrom(from);
    setDateTo(to);
    setDonations([]);
    fetchDonations(1, filter, from, to);
    // Always refresh summary from RPC
    fetchSummary(from, to);
  }, [fetchDonations, filter, fetchSummary]);

  // Auto-refresh when new donation is made
  useEffect(() => {
    const handler = () => {
      fetchDonations(1, filter, dateFrom, dateTo);
      fetchSummary(dateFrom, dateTo);
    };
    window.addEventListener('invalidate-donations', handler);
    return () => window.removeEventListener('invalidate-donations', handler);
  }, [fetchDonations, fetchSummary, filter, dateFrom, dateTo]);

  return {
    donations,
    loading,
    error,
    filter,
    hasMore,
    summary,
    summaryLoading,
    dateFrom,
    dateTo,
    changeFilter,
    changeDateRange,
    fetchDonations,
    fetchSummary,
    loadMore,
  };
}
