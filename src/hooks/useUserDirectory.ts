import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo, useEffect } from 'react';

export interface UserDirectoryEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  wallet_address: string | null;
  // Activity
  posts_count: number;
  comments_count: number;
  reactions_on_posts: number;
  friends_count: number;
  shares_count: number;
  livestreams_count: number;
  // Light Score
  total_light_score: number;
  tier: number;
  total_minted: number;
  // CAMLY rewards
  camly_calculated: number;
  camly_today: number;
  pending_reward: number;
  approved_reward: number;
  reward_status: string;
  camly_claimed: number;
  // USDT
  usdt_received: number;
}

export interface UserDirectoryStats {
  totalUsers: number;
  totalCamlyCalculated: number;
  totalCamlyClaimed: number;
  totalLightScore: number;
}

const TIER_NAMES: Record<number, string> = {
  0: 'New Soul',
  1: 'Light Seeker',
  2: 'Light Bearer',
  3: 'Light Guardian',
  4: 'Light Master',
};

export const getTierName = (tier: number) => TIER_NAMES[tier] || `Tier ${tier}`;

const fetchUserDirectory = async (): Promise<UserDirectoryEntry[]> => {
  // Fetch all data sources in parallel
  const [rewardsRes, profilesRes, claimsRes, lightRes, usdtRes] = await Promise.all([
    supabase.rpc('get_user_rewards_v2', { limit_count: 10000 }),
    supabase.from('profiles').select('id, username, avatar_url, public_wallet_address, pending_reward, approved_reward, reward_status'),
    supabase.from('reward_claims').select('user_id, amount'),
    supabase.from('light_reputation').select('user_id, total_light_score, tier, total_minted'),
    supabase.from('donations').select('recipient_id, amount, token_symbol').in('token_symbol', ['USDT', 'BTCB']),
  ]);

  const rewardsMap = new Map<string, any>();
  (rewardsRes.data || []).forEach((r: any) => rewardsMap.set(r.id, r));

  const profilesMap = new Map<string, any>();
  (profilesRes.data || []).forEach((p: any) => profilesMap.set(p.id, p));

  // Aggregate claims by user
  const claimsMap = new Map<string, number>();
  (claimsRes.data || []).forEach((c: any) => {
    claimsMap.set(c.user_id, (claimsMap.get(c.user_id) || 0) + Number(c.amount));
  });

  // Light reputation by user
  const lightMap = new Map<string, any>();
  (lightRes.data || []).forEach((l: any) => lightMap.set(l.user_id, l));

  // USDT received by user
  const usdtMap = new Map<string, number>();
  (usdtRes.data || []).forEach((d: any) => {
    usdtMap.set(d.recipient_id, (usdtMap.get(d.recipient_id) || 0) + Number(d.amount));
  });

  // Merge all user IDs
  const allUserIds = new Set<string>();
  profilesMap.forEach((_, id) => allUserIds.add(id));
  rewardsMap.forEach((_, id) => allUserIds.add(id));

  const entries: UserDirectoryEntry[] = [];
  allUserIds.forEach((userId) => {
    const profile = profilesMap.get(userId);
    const reward = rewardsMap.get(userId);
    const light = lightMap.get(userId);

    if (!profile) return; // Skip users without profiles

    entries.push({
      id: userId,
      username: profile.username || 'unknown',
      avatar_url: profile.avatar_url,
      wallet_address: profile.public_wallet_address || null,
      posts_count: Number(reward?.posts_count) || 0,
      comments_count: Number(reward?.comments_count) || 0,
      reactions_on_posts: Number(reward?.reactions_on_posts) || 0,
      friends_count: Number(reward?.friends_count) || 0,
      shares_count: Number(reward?.shares_count) || 0,
      livestreams_count: Number(reward?.livestreams_count) || 0,
      total_light_score: Number(light?.total_light_score) || 0,
      tier: Number(light?.tier) || 0,
      total_minted: Number(light?.total_minted) || 0,
      camly_calculated: Number(reward?.total_reward) || 0,
      camly_today: Number(reward?.today_reward) || 0,
      pending_reward: Number(profile.pending_reward) || 0,
      approved_reward: Number(profile.approved_reward) || 0,
      reward_status: profile.reward_status || 'pending',
      camly_claimed: claimsMap.get(userId) || 0,
      usdt_received: usdtMap.get(userId) || 0,
    });
  });

  // Sort by camly_calculated desc
  entries.sort((a, b) => b.camly_calculated - a.camly_calculated);
  return entries;
};

export const useUserDirectory = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Realtime: auto-refresh when donations change
  useEffect(() => {
    const channel = supabase
      .channel('user-directory-donations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-directory'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reward_claims' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-directory'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: allUsers, isLoading, error } = useQuery({
    queryKey: ['user-directory'],
    queryFn: fetchUserDirectory,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!allUsers) return [];
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.wallet_address?.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  const paginated = useMemo(() => {
    return filtered.slice(page * pageSize, (page + 1) * pageSize);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const stats: UserDirectoryStats = useMemo(() => {
    if (!allUsers) return { totalUsers: 0, totalCamlyCalculated: 0, totalCamlyClaimed: 0, totalLightScore: 0 };
    return {
      totalUsers: allUsers.length,
      totalCamlyCalculated: allUsers.reduce((s, u) => s + u.camly_calculated, 0),
      totalCamlyClaimed: allUsers.reduce((s, u) => s + u.camly_claimed, 0),
      totalLightScore: allUsers.reduce((s, u) => s + u.total_light_score, 0),
    };
  }, [allUsers]);

  const exportCSV = () => {
    if (!filtered || filtered.length === 0) return;
    const headers = ['STT', 'Username', 'Wallet', 'Posts', 'Comments', 'Reactions', 'Friends', 'Shares', 'Livestreams', 'Light Score', 'Tier', 'FUN Minted', 'CAMLY Tính Toán', 'CAMLY Đã Thưởng', 'Trạng Thái', 'USDT'];
    const rows = filtered.map((u, i) => [
      i + 1, u.username, u.wallet_address || '', u.posts_count, u.comments_count,
      u.reactions_on_posts, u.friends_count, u.shares_count, u.livestreams_count,
      u.total_light_score, getTierName(u.tier), u.total_minted,
      u.camly_calculated, u.camly_claimed, u.reward_status, u.usdt_received,
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `danh-sach-thanh-vien-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return {
    users: paginated,
    allUsers: filtered,
    isLoading,
    error,
    stats,
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    exportCSV,
  };
};
