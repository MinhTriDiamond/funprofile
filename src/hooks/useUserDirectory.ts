import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo, useEffect } from 'react';

export interface UserDirectoryEntry {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  created_at: string | null;
  is_banned: boolean;
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
  // Donations
  internal_sent: number;
  internal_received: number;
  web3_sent: number;
  web3_received: number;
}

export interface UserDirectoryStats {
  totalUsers: number;
  totalCamlyCalculated: number;
  totalCamlyClaimed: number;
  totalLightScore: number;
  totalPending: number;
  totalApproved: number;
  totalMinted: number;
  totalPosts: number;
  totalComments: number;
  totalInternalSent: number;
  totalInternalReceived: number;
  totalWeb3Sent: number;
  totalWeb3Received: number;
  totalWithdrawn: number;
}

export interface UserDirectoryFilters {
  scoreRange: 'all' | 'high' | 'medium' | 'low';
  funMoney: 'all' | 'has' | 'none';
  withdrawn: 'all' | 'yes' | 'no';
  status: 'all' | 'active' | 'banned';
  wallet: 'all' | 'has' | 'none';
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
  const [rewardsRes, profilesRes, claimsRes, lightRes, donationsRes] = await Promise.all([
    supabase.rpc('get_user_rewards_v2', { limit_count: 10000 }),
    supabase.from('profiles').select('id, username, full_name, avatar_url, public_wallet_address, pending_reward, approved_reward, reward_status, created_at, is_banned'),
    supabase.from('reward_claims').select('user_id, amount'),
    supabase.from('light_reputation').select('user_id, total_light_score, tier, total_minted'),
    supabase.from('donations').select('sender_id, recipient_id, amount, token_symbol, is_external'),
  ]);

  const rewardsMap = new Map<string, any>();
  (rewardsRes.data || []).forEach((r: any) => rewardsMap.set(r.id, r));

  const profilesMap = new Map<string, any>();
  (profilesRes.data || []).forEach((p: any) => profilesMap.set(p.id, p));

  const claimsMap = new Map<string, number>();
  (claimsRes.data || []).forEach((c: any) => {
    claimsMap.set(c.user_id, (claimsMap.get(c.user_id) || 0) + Number(c.amount));
  });

  const lightMap = new Map<string, any>();
  (lightRes.data || []).forEach((l: any) => lightMap.set(l.user_id, l));

  // Donations aggregation
  const internalSentMap = new Map<string, number>();
  const internalReceivedMap = new Map<string, number>();
  const web3SentMap = new Map<string, number>();
  const web3ReceivedMap = new Map<string, number>();
  const usdtMap = new Map<string, number>();

  (donationsRes.data || []).forEach((d: any) => {
    const amt = Number(d.amount);
    if (d.is_external) {
      if (d.sender_id) web3SentMap.set(d.sender_id, (web3SentMap.get(d.sender_id) || 0) + amt);
      web3ReceivedMap.set(d.recipient_id, (web3ReceivedMap.get(d.recipient_id) || 0) + amt);
    } else {
      if (d.sender_id) internalSentMap.set(d.sender_id, (internalSentMap.get(d.sender_id) || 0) + amt);
      internalReceivedMap.set(d.recipient_id, (internalReceivedMap.get(d.recipient_id) || 0) + amt);
    }
    if (['USDT', 'BTCB'].includes(d.token_symbol)) {
      usdtMap.set(d.recipient_id, (usdtMap.get(d.recipient_id) || 0) + amt);
    }
  });

  const allUserIds = new Set<string>();
  profilesMap.forEach((_, id) => allUserIds.add(id));
  rewardsMap.forEach((_, id) => allUserIds.add(id));

  const entries: UserDirectoryEntry[] = [];
  allUserIds.forEach((userId) => {
    const profile = profilesMap.get(userId);
    const reward = rewardsMap.get(userId);
    const light = lightMap.get(userId);

    if (!profile) return;

    entries.push({
      id: userId,
      username: profile.username || 'unknown',
      full_name: profile.full_name || null,
      avatar_url: profile.avatar_url,
      wallet_address: profile.public_wallet_address || null,
      created_at: profile.created_at || null,
      is_banned: profile.is_banned || false,
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
      internal_sent: internalSentMap.get(userId) || 0,
      internal_received: internalReceivedMap.get(userId) || 0,
      web3_sent: web3SentMap.get(userId) || 0,
      web3_received: web3ReceivedMap.get(userId) || 0,
    });
  });

  entries.sort((a, b) => b.camly_calculated - a.camly_calculated);
  return entries;
};

export const useUserDirectory = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<UserDirectoryFilters>({
    scoreRange: 'all',
    funMoney: 'all',
    withdrawn: 'all',
    status: 'all',
    wallet: 'all',
  });
  const pageSize = 50;

  useEffect(() => {
    const channel = supabase
      .channel('user-directory-donations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-directory'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_claims' }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-directory'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: allUsers, isLoading, error } = useQuery({
    queryKey: ['user-directory'],
    queryFn: fetchUserDirectory,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!allUsers) return [];
    let result = allUsers;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.wallet_address?.toLowerCase().includes(q)
      );
    }

    // Score filter
    if (filters.scoreRange === 'high') result = result.filter(u => u.total_light_score >= 1000);
    else if (filters.scoreRange === 'medium') result = result.filter(u => u.total_light_score >= 100 && u.total_light_score < 1000);
    else if (filters.scoreRange === 'low') result = result.filter(u => u.total_light_score < 100);

    // FUN Money
    if (filters.funMoney === 'has') result = result.filter(u => u.total_minted > 0);
    else if (filters.funMoney === 'none') result = result.filter(u => u.total_minted === 0);

    // Withdrawn
    if (filters.withdrawn === 'yes') result = result.filter(u => u.camly_claimed > 0);
    else if (filters.withdrawn === 'no') result = result.filter(u => u.camly_claimed === 0);

    // Status
    if (filters.status === 'active') result = result.filter(u => !u.is_banned);
    else if (filters.status === 'banned') result = result.filter(u => u.is_banned);

    // Wallet
    if (filters.wallet === 'has') result = result.filter(u => !!u.wallet_address);
    else if (filters.wallet === 'none') result = result.filter(u => !u.wallet_address);

    return result;
  }, [allUsers, search, filters]);

  const paginated = useMemo(() => {
    return filtered.slice(page * pageSize, (page + 1) * pageSize);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const stats: UserDirectoryStats = useMemo(() => {
    if (!allUsers) return {
      totalUsers: 0, totalCamlyCalculated: 0, totalCamlyClaimed: 0, totalLightScore: 0,
      totalPending: 0, totalApproved: 0, totalMinted: 0, totalPosts: 0, totalComments: 0,
      totalInternalSent: 0, totalInternalReceived: 0, totalWeb3Sent: 0, totalWeb3Received: 0, totalWithdrawn: 0,
    };
    return {
      totalUsers: allUsers.length,
      totalCamlyCalculated: allUsers.reduce((s, u) => s + u.camly_calculated, 0),
      totalCamlyClaimed: allUsers.reduce((s, u) => s + u.camly_claimed, 0),
      totalLightScore: allUsers.reduce((s, u) => s + u.total_light_score, 0),
      totalPending: allUsers.reduce((s, u) => s + u.pending_reward, 0),
      totalApproved: allUsers.reduce((s, u) => s + u.approved_reward, 0),
      totalMinted: allUsers.reduce((s, u) => s + u.total_minted, 0),
      totalPosts: allUsers.reduce((s, u) => s + u.posts_count, 0),
      totalComments: allUsers.reduce((s, u) => s + u.comments_count, 0),
      totalInternalSent: allUsers.reduce((s, u) => s + u.internal_sent, 0),
      totalInternalReceived: allUsers.reduce((s, u) => s + u.internal_received, 0),
      totalWeb3Sent: allUsers.reduce((s, u) => s + u.web3_sent, 0),
      totalWeb3Received: allUsers.reduce((s, u) => s + u.web3_received, 0),
      totalWithdrawn: allUsers.reduce((s, u) => s + u.camly_claimed, 0),
    };
  }, [allUsers]);

  const exportCSV = () => {
    if (!filtered || filtered.length === 0) return;
    const headers = ['STT', 'Username', 'Họ tên', 'Trạng thái', 'Ngày tham gia', 'Wallet', 'Posts', 'Comments', 'Reactions', 'Friends', 'Shares', 'Livestreams', 'Light Score', 'Tier', 'FUN Minted', 'CAMLY Tính Toán', 'CAMLY Đã Thưởng', 'Pending', 'Approved', 'Tặng NB (gửi)', 'Tặng NB (nhận)', 'Tặng Web3 (gửi)', 'Tặng Web3 (nhận)', 'USDT'];
    const rows = filtered.map((u, i) => [
      i + 1, u.username, u.full_name || '', u.is_banned ? 'Cấm' : 'Hoạt động',
      u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '',
      u.wallet_address || '', u.posts_count, u.comments_count,
      u.reactions_on_posts, u.friends_count, u.shares_count, u.livestreams_count,
      u.total_light_score, getTierName(u.tier), u.total_minted,
      u.camly_calculated, u.camly_claimed, u.pending_reward, u.approved_reward,
      u.internal_sent, u.internal_received, u.web3_sent, u.web3_received, u.usdt_received,
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
    filters,
    setFilters,
  };
};
