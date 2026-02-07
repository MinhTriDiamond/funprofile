import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BenefactorEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  total_donated: number;
  total_donations: number;
  total_light_score: number;
  rank: number;
}

export interface RecipientEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  total_received: number;
  total_donations: number;
  rank: number;
}

export interface UserDonationStats {
  total_sent: number;
  total_received: number;
  donations_sent: number;
  donations_received: number;
  light_score_from_donations: number;
  unique_recipients: number;
  unique_donors: number;
}

interface UseBenefactorLeaderboardOptions {
  limit?: number;
  offset?: number;
  timeRange?: 'day' | 'week' | 'month' | 'all';
  tokenSymbol?: string;
}

export function useBenefactorLeaderboard(options: UseBenefactorLeaderboardOptions = {}) {
  const { limit = 50, offset = 0, timeRange = 'all', tokenSymbol } = options;

  return useQuery({
    queryKey: ['benefactor-leaderboard', limit, offset, timeRange, tokenSymbol],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_benefactor_leaderboard', {
        p_limit: limit,
        p_offset: offset,
        p_time_range: timeRange,
        p_token_symbol: tokenSymbol || null,
      });

      if (error) {
        console.error('Error fetching benefactor leaderboard:', error);
        throw error;
      }

      return (data || []) as BenefactorEntry[];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useRecipientLeaderboard(options: UseBenefactorLeaderboardOptions = {}) {
  const { limit = 50, offset = 0, timeRange = 'all' } = options;

  return useQuery({
    queryKey: ['recipient-leaderboard', limit, offset, timeRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recipient_leaderboard', {
        p_limit: limit,
        p_offset: offset,
        p_time_range: timeRange,
      });

      if (error) {
        console.error('Error fetching recipient leaderboard:', error);
        throw error;
      }

      return (data || []) as RecipientEntry[];
    },
    staleTime: 60 * 1000,
  });
}

export function useUserDonationStats(userId: string | null) {
  return useQuery({
    queryKey: ['user-donation-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_user_donation_stats', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error fetching user donation stats:', error);
        throw error;
      }

      return data?.[0] as UserDonationStats | null;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useDonationHistory(userId: string | null, type: 'sent' | 'received' | 'all' = 'all') {
  return useQuery({
    queryKey: ['donation-history', userId, type],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_donation_history', {
        p_user_id: userId,
        p_type: type,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) {
        console.error('Error fetching donation history:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
