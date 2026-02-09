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
          d.recipient?.username?.toLowerCase().includes(term)
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
        .select('amount, token_symbol, light_score_earned, status');

      if (error) throw error;

      const totalByToken: Record<string, number> = {};
      let totalLightScore = 0;
      let confirmedCount = 0;

      (data || []).forEach((d: any) => {
        const amount = parseFloat(d.amount) || 0;
        totalByToken[d.token_symbol] = (totalByToken[d.token_symbol] || 0) + amount;
        totalLightScore += d.light_score_earned || 0;
        if (d.status === 'confirmed') confirmedCount++;
      });

      return {
        totalCount: data?.length || 0,
        confirmedCount,
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
export async function fetchAllDonationsForExport(filters: Omit<AdminDonationFilters, 'page' | 'limit'>) {
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
      d.recipient?.username?.toLowerCase().includes(term)
    );
  }

  return donations;
}
