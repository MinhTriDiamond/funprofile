import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DonationFilter = 'all' | 'sent' | 'received';

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
}

interface DonationSummary {
  totalReceived: number;
  totalSent: number;
  count: number;
}

const PAGE_SIZE = 20;

export function usePublicDonationHistory(userId: string | undefined) {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DonationFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchDonations = useCallback(async (pageNum = 1, currentFilter: DonationFilter = filter) => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('donations')
        .select(`
          id, amount, token_symbol, tx_hash, status, message, created_at, chain_id,
          sender_id, recipient_id,
          sender:profiles!donations_sender_id_fkey(username, display_name, avatar_url),
          recipient:profiles!donations_recipient_id_fkey(username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

      if (currentFilter === 'sent') {
        query = query.eq('sender_id', userId);
      } else if (currentFilter === 'received') {
        query = query.eq('recipient_id', userId);
      } else {
        query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      const mapped: DonationRecord[] = (data || []).map((d: any) => ({
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
      }));

      setDonations(prev => pageNum === 1 ? mapped : [...prev, ...mapped]);
      setPage(pageNum);
      setHasMore(mapped.length >= PAGE_SIZE);
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

  const getSummary = useCallback((): DonationSummary => {
    if (!userId) return { totalReceived: 0, totalSent: 0, count: 0 };
    let totalReceived = 0;
    let totalSent = 0;
    for (const d of donations) {
      const val = Number(d.amount) || 0;
      if (d.recipient_id === userId) totalReceived += val;
      if (d.sender_id === userId) totalSent += val;
    }
    return { totalReceived, totalSent, count: donations.length };
  }, [donations, userId]);

  return {
    donations,
    loading,
    error,
    filter,
    hasMore,
    changeFilter,
    fetchDonations,
    loadMore,
    getSummary,
  };
}
