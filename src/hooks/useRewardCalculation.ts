import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserRewardStats {
  postsCount: number;
  reactionsOnPosts: number;
  commentsOnPosts: number;
  sharesCount: number;
  friendsCount: number;
  totalReward: number;
  claimedAmount: number;
  claimableAmount: number;
}

/**
 * Centralized reward calculation formula (Updated 2025-01-15)
 * Posts: 1 post = 10,000 CAMLY
 * Reactions received: 1 reaction = 1,000 CAMLY
 * Comments received: 1 comment = 2,000 CAMLY
 * Shares received: 1 share = 10,000 CAMLY
 * Friends: 1 friend = 10,000 CAMLY
 */
export const calculateReward = (
  postsCount: number,
  reactionsOnPosts: number,
  commentsOnPosts: number,
  sharesCount: number,
  friendsCount: number
): number => {
  const postsReward = postsCount * 10000;
  const reactionsReward = reactionsOnPosts * 1000;
  const commentsReward = commentsOnPosts * 2000;
  const sharesReward = sharesCount * 10000;
  const friendsReward = friendsCount * 10000;
  
  return postsReward + reactionsReward + commentsReward + sharesReward + friendsReward;
};

/**
 * Fetch reward stats for a user - uses RPC function for consistency with Leaderboard
 */
const fetchRewardStats = async (userId: string): Promise<UserRewardStats> => {
  // Use RPC function to get consistent reward calculation with Leaderboard
  const [userRewardsRes, claimsRes] = await Promise.all([
    supabase.rpc('get_user_rewards', { limit_count: 10000 }),
    supabase
      .from('reward_claims')
      .select('amount')
      .eq('user_id', userId)
  ]);

  // Find the current user's data from RPC result
  const userData = userRewardsRes.data?.find((u: any) => u.id === userId);
  
  const postsCount = Number(userData?.posts_count) || 0;
  const reactionsOnPosts = Number(userData?.reactions_on_posts) || 0;
  const commentsOnPosts = Number(userData?.comments_count) || 0;
  const sharesCount = Number(userData?.shares_count) || 0;
  const friendsCount = Number(userData?.friends_count) || 0;
  const totalReward = Number(userData?.total_reward) || 0;
  
  const claimedAmount = claimsRes.data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
  const claimableAmount = Math.max(0, totalReward - claimedAmount);
  
  return {
    postsCount,
    reactionsOnPosts,
    commentsOnPosts,
    sharesCount,
    friendsCount,
    totalReward,
    claimedAmount,
    claimableAmount
  };
};

/**
 * Hook to calculate user reward stats with React Query caching
 * - Caches data for 5 minutes (staleTime)
 * - Keeps data in cache for 10 minutes (gcTime)
 * - Auto-refetches when userId changes
 */
export const useRewardCalculation = (userId: string | null) => {
  const queryClient = useQueryClient();

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['reward-stats', userId],
    queryFn: () => fetchRewardStats(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnWindowFocus: false,
  });

  // Invalidate cache when needed (e.g., after claiming rewards)
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['reward-stats', userId] });
  };

  return { 
    stats: stats || null, 
    isLoading, 
    error: error as Error | null, 
    refetch,
    invalidateCache 
  };
};

export default useRewardCalculation;
