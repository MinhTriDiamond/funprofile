import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TIERS } from '@/config/pplp';

export interface UserDirectoryEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  public_wallet_address: string | null;
  custodial_wallet_address: string | null;
  // Activity
  posts_count: number;
  comments_count: number;
  reactions_on_posts: number;
  shares_count: number;
  friends_count: number;
  livestreams_count: number;
  // Rewards
  total_reward: number;
  today_reward: number;
  claimed_amount: number;
  claimable_amount: number;
  // Light Score
  total_light_score: number;
  tier: number;
  tier_name: string;
  tier_emoji: string;
  total_minted: number;
  actions_count: number;
  // Donations
  total_sent: number;
  total_received: number;
  usdt_received: number;
  btcb_received: number;
}

export type SortField = 'total_reward' | 'total_light_score' | 'posts_count' | 'username';

interface UseUserDirectoryReturn {
  users: UserDirectoryEntry[];
  filteredUsers: UserDirectoryEntry[];
  isLoading: boolean;
  error: string | null;
  search: string;
  setSearch: (s: string) => void;
  sortField: SortField;
  setSortField: (f: SortField) => void;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalUsers: number;
  totalReward: number;
  totalLightScore: number;
  exportCsv: () => void;
}

const PAGE_SIZE = 50;

const getTierInfo = (tier: number) => {
  const t = TIERS[tier as keyof typeof TIERS] || TIERS[0];
  return { name: t.name, emoji: t.emoji };
};

export const useUserDirectory = (): UseUserDirectoryReturn => {
  const [allUsers, setAllUsers] = useState<UserDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('total_reward');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1-4: Fetch all data sources in parallel
      const [rewardsRes, lightRes, claimsRes, profilesRes, donationsSentRes, donationsReceivedRes] = await Promise.all([
        supabase.rpc('get_user_rewards_v2', { limit_count: 10000 }),
        supabase.from('light_reputation').select('user_id, total_light_score, tier, total_minted, actions_count'),
        supabase.from('reward_claims').select('user_id, amount'),
        supabase.from('profiles').select('id, public_wallet_address, custodial_wallet_address'),
        supabase.from('donations').select('sender_id, amount, token_symbol').eq('status', 'confirmed'),
        supabase.from('donations').select('recipient_id, amount, token_symbol').eq('status', 'confirmed'),
      ]);

      if (rewardsRes.error) throw new Error(rewardsRes.error.message);

      // Build lookup maps
      const lightMap = new Map<string, { total_light_score: number; tier: number; total_minted: number; actions_count: number }>();
      (lightRes.data || []).forEach((r: any) => lightMap.set(r.user_id, r));

      const claimsMap = new Map<string, number>();
      (claimsRes.data || []).forEach((c: any) => {
        claimsMap.set(c.user_id, (claimsMap.get(c.user_id) || 0) + Number(c.amount));
      });

      const walletMap = new Map<string, { public_wallet_address: string | null; custodial_wallet_address: string | null }>();
      (profilesRes.data || []).forEach((p: any) => walletMap.set(p.id, p));

      // Donations sent aggregation
      const sentMap = new Map<string, number>();
      (donationsSentRes.data || []).forEach((d: any) => {
        sentMap.set(d.sender_id, (sentMap.get(d.sender_id) || 0) + Number(d.amount));
      });

      // Donations received aggregation by token
      const receivedMap = new Map<string, { total: number; usdt: number; btcb: number }>();
      (donationsReceivedRes.data || []).forEach((d: any) => {
        const prev = receivedMap.get(d.recipient_id) || { total: 0, usdt: 0, btcb: 0 };
        const amt = Number(d.amount);
        prev.total += amt;
        if (d.token_symbol === 'USDT') prev.usdt += amt;
        if (d.token_symbol === 'BTCB') prev.btcb += amt;
        receivedMap.set(d.recipient_id, prev);
      });

      // Step 5: Merge
      const merged: UserDirectoryEntry[] = (rewardsRes.data || []).map((u: any) => {
        const light = lightMap.get(u.id);
        const claimed = claimsMap.get(u.id) || 0;
        const wallet = walletMap.get(u.id);
        const received = receivedMap.get(u.id) || { total: 0, usdt: 0, btcb: 0 };
        const tierNum = light?.tier ?? 0;
        const tierInfo = getTierInfo(tierNum);

        return {
          id: u.id,
          username: u.username || 'Unknown',
          avatar_url: u.avatar_url,
          public_wallet_address: wallet?.public_wallet_address || null,
          custodial_wallet_address: wallet?.custodial_wallet_address || null,
          posts_count: Number(u.posts_count) || 0,
          comments_count: Number(u.comments_count) || 0,
          reactions_on_posts: Number(u.reactions_on_posts) || 0,
          shares_count: Number(u.shares_count) || 0,
          friends_count: Number(u.friends_count) || 0,
          livestreams_count: Number(u.livestreams_count) || 0,
          total_reward: Number(u.total_reward) || 0,
          today_reward: Number(u.today_reward) || 0,
          claimed_amount: claimed,
          claimable_amount: Math.max(0, (Number(u.total_reward) || 0) - claimed),
          total_light_score: Number(light?.total_light_score) || 0,
          tier: tierNum,
          tier_name: tierInfo.name,
          tier_emoji: tierInfo.emoji,
          total_minted: Number(light?.total_minted) || 0,
          actions_count: light?.actions_count || 0,
          total_sent: sentMap.get(u.id) || 0,
          total_received: received.total,
          usdt_received: received.usdt,
          btcb_received: received.btcb,
        };
      });

      setAllUsers(merged);
    } catch (err) {
      console.error('[useUserDirectory]', err);
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 6: Search, sort, paginate
  const filtered = useMemo(() => {
    let result = [...allUsers];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u => u.username.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (sortField === 'username') return a.username.localeCompare(b.username);
      return (b[sortField] as number) - (a[sortField] as number);
    });
    return result;
  }, [allUsers, search, sortField]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalReward = useMemo(() => allUsers.reduce((s, u) => s + u.total_reward, 0), [allUsers]);
  const totalLightScore = useMemo(() => allUsers.reduce((s, u) => s + u.total_light_score, 0), [allUsers]);

  const exportCsv = useCallback(() => {
    const headers = ['STT', 'Username', 'Wallet', 'Posts', 'Comments', 'Reactions', 'Shares', 'Friends', 'Livestreams', 'Light Score', 'Tier', 'FUN Minted', 'CAMLY Total', 'CAMLY Claimed', 'CAMLY Claimable', 'USDT Received', 'BTCB Received', 'Tổng Tặng', 'Tổng Nhận'];
    const rows = filtered.map((u, i) => [
      i + 1, u.username, u.public_wallet_address || u.custodial_wallet_address || '',
      u.posts_count, u.comments_count, u.reactions_on_posts, u.shares_count, u.friends_count, u.livestreams_count,
      u.total_light_score, `${u.tier_emoji} ${u.tier_name}`, u.total_minted,
      u.total_reward, u.claimed_amount, u.claimable_amount,
      u.usdt_received, u.btcb_received, u.total_sent, u.total_received,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  // Reset page when search/sort changes
  useEffect(() => { setPage(1); }, [search, sortField]);

  return {
    users: allUsers,
    filteredUsers: paged,
    isLoading,
    error,
    search, setSearch,
    sortField, setSortField,
    page, setPage,
    totalPages,
    totalUsers: allUsers.length,
    totalReward,
    totalLightScore,
    exportCsv,
  };
};
