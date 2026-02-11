import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DonationRecord } from './useDonationHistory';

export interface AdminDonationFilters {
  searchTerm: string;
  tokenSymbol: string;
  status: 'all' | 'pending' | 'confirmed' | 'failed';
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
  onlyOnchain: boolean;
  type: 'all' | 'reward' | 'transfer';
}

export interface AdminDonationStats {
  totalCount: number;
  totalByToken: Record<string, number>;
  totalLightScore: number;
}

const DEFAULT_FILTERS: AdminDonationFilters = {
  searchTerm: '',
  tokenSymbol: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 50,
  onlyOnchain: false,
  type: 'all',
};

export function useAdminDonationHistory() {
  const [filters, setFilters] = useState<AdminDonationFilters>(DEFAULT_FILTERS);

  const updateFilters = (newFilters: Partial<AdminDonationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: newFilters.page ?? 1 }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Query donations with filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-donation-history', filters],
    queryFn: async () => {
      let query = supabase
        .from('donations')
        .select(`
          id,
          amount,
          token_symbol,
          message,
          tx_hash,
          light_score_earned,
          created_at,
          status,
          sender:profiles!donations_sender_id_fkey(id, username, avatar_url),
          recipient:profiles!donations_recipient_id_fkey(id, username, avatar_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.tokenSymbol !== 'all') {
        query = query.eq('token_symbol', filters.tokenSymbol);
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }

      if (filters.onlyOnchain) {
        query = query.not('tx_hash', 'is', null);
      }

      // Pagination
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Filter by search term (username) in memory
      let donations = (data || []).map((d: any) => ({
        id: d.id,
        sender: d.sender,
        recipient: d.recipient,
        amount: d.amount,
        token_symbol: d.token_symbol,
        message: d.message,
        tx_hash: d.tx_hash,
        light_score_earned: d.light_score_earned,
        created_at: d.created_at,
        status: d.status,
      })) as DonationRecord[];

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        donations = donations.filter(d => 
          d.sender?.username?.toLowerCase().includes(term) ||
          d.recipient?.username?.toLowerCase().includes(term) ||
          d.tx_hash?.toLowerCase().includes(term)
        );
      }

      return {
        donations,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      };
    },
    staleTime: 30000,
  });

  // Stats query
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['admin-donation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('amount, token_symbol, light_score_earned, status, created_at');

      if (error) throw error;

      const totalByToken: Record<string, number> = {};
      let totalLightScore = 0;
      let confirmedCount = 0;
      let pendingCount = 0;
      let totalValue = 0;
      let todayCount = 0;
      const todayStr = new Date().toISOString().split('T')[0];

      (data || []).forEach((d: any) => {
        const amount = parseFloat(d.amount) || 0;
        totalByToken[d.token_symbol] = (totalByToken[d.token_symbol] || 0) + amount;
        totalLightScore += d.light_score_earned || 0;
        totalValue += amount;
        if (d.status === 'confirmed') confirmedCount++;
        if (d.status === 'pending') pendingCount++;
        if (d.created_at?.startsWith(todayStr)) todayCount++;
      });

      return {
        totalCount: data?.length || 0,
        confirmedCount,
        pendingCount,
        todayCount,
        totalValue,
        totalByToken,
        totalLightScore,
      };
    },
    staleTime: 60000,
  });

  return {
    donations: data?.donations || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 1,
    stats,
    filters,
    isLoading,
    isStatsLoading,
    updateFilters,
    resetFilters,
    refetch,
  };
}

// Export all donations for CSV
export async function fetchAllDonationsForExport(filters: Partial<AdminDonationFilters> & { searchTerm: string; tokenSymbol: string; status: string; dateFrom: string; dateTo: string }) {
  let query = supabase
    .from('donations')
    .select(`
      id,
      amount,
      token_symbol,
      message,
      tx_hash,
      light_score_earned,
      created_at,
      status,
      sender:profiles!donations_sender_id_fkey(id, username, avatar_url),
      recipient:profiles!donations_recipient_id_fkey(id, username, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (filters.tokenSymbol !== 'all') {
    query = query.eq('token_symbol', filters.tokenSymbol);
  }

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
  }

  if (filters.onlyOnchain) {
    query = query.not('tx_hash', 'is', null);
  }

  const { data, error } = await query;

  if (error) throw error;

  let donations = (data || []).map((d: any) => ({
    id: d.id,
    sender: d.sender,
    recipient: d.recipient,
    amount: d.amount,
    token_symbol: d.token_symbol,
    message: d.message,
    tx_hash: d.tx_hash,
    light_score_earned: d.light_score_earned,
    created_at: d.created_at,
    status: d.status,
  })) as DonationRecord[];

  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    donations = donations.filter(d => 
      d.sender?.username?.toLowerCase().includes(term) ||
      d.recipient?.username?.toLowerCase().includes(term) ||
      d.tx_hash?.toLowerCase().includes(term)
    );
  }

  return donations;
}
