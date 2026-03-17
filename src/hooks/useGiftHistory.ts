import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Convert YYYY-MM-DD (VN date) to UTC range
function vnDateToUtcRange(dateStr: string): { start: string; end: string } {
  // VN is UTC+7, so 00:00 VN = 17:00 previous day UTC
  const [y, m, d] = dateStr.split('-').map(Number);
  const vnMidnight = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const utcStart = new Date(vnMidnight.getTime() - 7 * 60 * 60 * 1000);
  const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000);
  return { start: utcStart.toISOString(), end: utcEnd.toISOString() };
}

function getTodayVN(): string {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
}

// Token totals per day per symbol
export interface DayTokenTotals {
  [symbol: string]: { amount: number; count: number };
}

// Fetch gift counts per day using database function (bypasses 1000 row limit)
const fetchGiftDayCounts = async (): Promise<Record<string, number>> => {
  const { data, error } = await supabase.rpc('get_gift_day_counts');

  if (error) {
    console.error('Gift day counts error:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    counts[row.vn_date] = Number(row.gift_count) || 0;
  });
  return counts;
};

// Fetch token totals per day
const fetchGiftDayTokenTotals = async (): Promise<Record<string, DayTokenTotals>> => {
  const { data, error } = await supabase.rpc('get_gift_day_token_totals');

  if (error) {
    console.error('Gift day token totals error:', error);
    return {};
  }

  const result: Record<string, DayTokenTotals> = {};
  (data || []).forEach((row: any) => {
    const dateStr = row.vn_date;
    if (!result[dateStr]) result[dateStr] = {};
    result[dateStr][row.token_symbol] = {
      amount: Number(row.total_amount) || 0,
      count: Number(row.tx_count) || 0,
    };
  });
  return result;
};

// Fetch gift posts for a specific VN date
const fetchGiftPostsByDate = async (dateStr: string) => {
  const { start, end } = vnDateToUtcRange(dateStr);

  const { data, error } = await supabase
    .from('posts')
    .select(`*, public_profiles!posts_user_id_fkey (username, display_name, avatar_url, public_wallet_address, is_banned)`)
    .eq('post_type', 'gift_celebration')
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Gift posts by date error:', error);
    return [];
  }

  return (data || []).map((post: any) => ({
    ...post,
    profiles: post.public_profiles,
    media_urls: post.media_urls || null,
    visibility: post.visibility || 'public',
  })).filter((p: any) => !p.profiles?.is_banned);
};

// Fetch stats for history posts
const fetchHistoryPostStats = async (postIds: string[]) => {
  if (postIds.length === 0) return {};
  try {
    const { data, error } = await supabase.rpc('get_post_stats', { p_post_ids: postIds });
    if (error) throw error;
    const stats: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      const reactions = Array.isArray(row.reactions) ? row.reactions : [];
      stats[row.post_id] = {
        reactions: reactions.map((r: any) => ({ id: r.id, user_id: r.user_id, type: r.type })),
        commentCount: Number(row.comment_count) || 0,
        shareCount: Number(row.share_count) || 0,
      };
    });
    postIds.forEach(id => {
      if (!stats[id]) stats[id] = { reactions: [], commentCount: 0, shareCount: 0 };
    });
    return stats;
  } catch {
    return postIds.reduce((acc, id) => ({ ...acc, [id]: { reactions: [], commentCount: 0, shareCount: 0 } }), {});
  }
};

export const useGiftHistory = (selectedDate: string | null) => {
  const today = getTodayVN();
  const isToday = !selectedDate || selectedDate === today;

  const dayCountsQuery = useQuery({
    queryKey: ['gift-day-counts'],
    queryFn: fetchGiftDayCounts,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const dayTokenTotalsQuery = useQuery({
    queryKey: ['gift-day-token-totals'],
    queryFn: fetchGiftDayTokenTotals,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: ['gift-history-posts', selectedDate],
    queryFn: async () => {
      if (!selectedDate || isToday) return { posts: [], postStats: {} };
      const posts = await fetchGiftPostsByDate(selectedDate);
      const postIds = posts.map((p: any) => p.id);
      const postStats = await fetchHistoryPostStats(postIds);
      return { posts, postStats };
    },
    enabled: !isToday && !!selectedDate,
    staleTime: 30 * 1000,
  });

  return {
    dateCounts: dayCountsQuery.data || {},
    dateTokenTotals: dayTokenTotalsQuery.data || {},
    historyPosts: historyQuery.data?.posts || [],
    historyPostStats: historyQuery.data?.postStats || {},
    isLoadingHistory: historyQuery.isLoading,
    isToday,
    todayVN: today,
  };
};

export { getTodayVN };
