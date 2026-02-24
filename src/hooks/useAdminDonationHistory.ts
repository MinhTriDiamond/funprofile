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
          sender_address,
          is_external,
          metadata,
          sender:public_profiles!donations_sender_id_fkey(id, username, avatar_url, public_wallet_address),
          recipient:public_profiles!donations_recipient_id_fkey(id, username, avatar_url, public_wallet_address)
        `, { count: 'exact' })
        .order('confirmed_at', { ascending: false, nullsFirst: false })
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

      // Server-side search: find matching user IDs first, then filter donations
      if (filters.searchTerm) {
        const term = filters.searchTerm.trim();
        
        // Check if search term looks like a tx hash
        if (term.startsWith('0x') && term.length > 10) {
          query = query.ilike('tx_hash', `%${term}%`);
        } else {
          // Search by username - find matching profile IDs first
          const { data: matchingProfiles } = await supabase
            .from('public_profiles')
            .select('id')
            .ilike('username', `%${term}%`);
          
          const matchingIds = (matchingProfiles || []).map(p => p.id);
          
          if (matchingIds.length === 0) {
            // No matching users, return empty
            return { donations: [], totalCount: 0, totalPages: 0 };
          }
          
          // Filter donations where sender OR recipient matches
          query = query.or(
            matchingIds.map(id => `sender_id.eq.${id}`).join(',') + ',' +
            matchingIds.map(id => `recipient_id.eq.${id}`).join(',')
          );
        }
      }

      // Pagination
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const donations = (data || []).map((d: any) => ({
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
        sender_address: d.sender_address,
        is_external: d.is_external,
        metadata: d.metadata,
      })) as DonationRecord[];

      return {
        donations,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      };
    },
    staleTime: 30000,
  });

  // Stats query - use count queries to avoid 1000 row limit
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['admin-donation-stats'],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];

      // Run all count queries in parallel
      const [totalRes, confirmedRes, pendingRes, todayRes] = await Promise.all([
        supabase.from('donations').select('id', { count: 'exact', head: true }),
        supabase.from('donations').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from('donations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('donations').select('id', { count: 'exact', head: true }).gte('created_at', todayStr).lt('created_at', todayStr + 'T23:59:59.999Z'),
      ]);

      // Fetch all donations in pages for token aggregation
      const totalByToken: Record<string, number> = {};
      let totalLightScore = 0;
      let totalValue = 0;
      let offset = 0;
      const PAGE = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data: batch, error } = await supabase
          .from('donations')
          .select('amount, token_symbol, light_score_earned')
          .range(offset, offset + PAGE - 1);
        if (error) throw error;
        if (!batch || batch.length === 0) break;
        for (const d of batch) {
          const amount = parseFloat(d.amount) || 0;
          totalByToken[d.token_symbol] = (totalByToken[d.token_symbol] || 0) + amount;
          totalLightScore += d.light_score_earned || 0;
          totalValue += amount;
        }
        if (batch.length < PAGE) hasMore = false;
        else offset += PAGE;
      }

      return {
        totalCount: totalRes.count || 0,
        confirmedCount: confirmedRes.count || 0,
        pendingCount: pendingRes.count || 0,
        todayCount: todayRes.count || 0,
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
      sender_address,
      is_external,
      metadata,
      sender:public_profiles!donations_sender_id_fkey(id, username, avatar_url, public_wallet_address),
      recipient:public_profiles!donations_recipient_id_fkey(id, username, avatar_url, public_wallet_address)
    `)
    .order('confirmed_at', { ascending: false, nullsFirst: false })
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

  if (filters.searchTerm) {
    const term = filters.searchTerm.trim();
    
    if (term.startsWith('0x') && term.length > 10) {
      query = query.ilike('tx_hash', `%${term}%`);
    } else {
      const { data: matchingProfiles } = await supabase
        .from('public_profiles')
        .select('id')
        .ilike('username', `%${term}%`);
      
      const matchingIds = (matchingProfiles || []).map(p => p.id);
      
      if (matchingIds.length === 0) {
        return [];
      }
      
      query = query.or(
        matchingIds.map(id => `sender_id.eq.${id}`).join(',') + ',' +
        matchingIds.map(id => `recipient_id.eq.${id}`).join(',')
      );
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  const donations = (data || []).map((d: any) => ({
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
    sender_address: d.sender_address,
    is_external: d.is_external,
    metadata: d.metadata,
  })) as DonationRecord[];

  return donations;
}
