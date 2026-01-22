import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, MessageCircle, Star, Share2, BadgeDollarSign, Coins, Gift, Wallet, Users, Image, Video, Calendar } from 'lucide-react';
import { useRewardCalculation, REWARD_CONFIG } from '@/hooks/useRewardCalculation';
// Use direct paths for logos to ensure consistency across all environments

interface CoverHonorBoardProps {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export const CoverHonorBoard = ({ userId, username, avatarUrl }: CoverHonorBoardProps) => {
  // Use the centralized reward calculation hook with React Query caching
  const { stats: rewardStats, isLoading: rewardLoading } = useRewardCalculation(userId);

  // Fetch additional data (transactions for total_money) with React Query caching
  const { data: additionalData, isLoading: additionalLoading } = useQuery({
    queryKey: ['profile-additional-stats', userId],
    queryFn: async () => {
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'success');

      const receivedAmount = transactionsData?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
      return { receivedAmount };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const loading = rewardLoading || additionalLoading;

  // Calculate derived values
  const stats = {
    posts_count: rewardStats?.postsCount || 0,
    comments_count: rewardStats?.commentsOnPosts || 0,
    reactions_on_posts: rewardStats?.reactionsOnPosts || 0,
    shares_count: rewardStats?.sharesCount || 0,
    friends_count: rewardStats?.friendsCount || 0,
    livestreams_count: rewardStats?.livestreamsCount || 0,
    nfts_count: 0, // NFTs not implemented yet
    claimable: rewardStats?.claimableAmount || 0,
    claimed: rewardStats?.claimedAmount || 0,
    today_reward: rewardStats?.todayReward || 0,
    total_reward: rewardStats?.totalReward || 0,
    total_money: (rewardStats?.totalReward || 0) + (additionalData?.receivedAmount || 0),
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <>
        {/* Desktop: on cover photo */}
        <div className="hidden md:block absolute right-3 sm:right-4 top-3 sm:top-4 bottom-3 sm:bottom-4 w-[50%] max-w-[500px]">
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
        {/* Mobile: placeholder below cover - rendered in parent */}
      </>
    );
  }

  const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="flex items-center justify-between py-1 px-2 sm:px-2.5 rounded-lg border border-yellow-500/40 bg-green-800/90 backdrop-blur-sm">
      <div className="flex items-center gap-1 sm:gap-1.5">
        <div className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
          {icon}
        </div>
        <span className="text-yellow-400 font-bold text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wide drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
          {label}
        </span>
      </div>
      <span className="text-white font-bold text-[11px] sm:text-xs md:text-sm drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
        {formatNumber(value)}
      </span>
    </div>
  );

  return (
    <>
      {/* Desktop: Overlay on cover photo */}
      <div className="hidden md:block absolute right-3 sm:right-4 top-3 sm:top-4 bottom-3 sm:bottom-4 w-[50%] max-w-[500px] min-w-[300px]">
        {/* Main Container - Fill height to match cover photo bounds */}
        <div className="h-full rounded-2xl overflow-hidden border-2 border-yellow-400 flex flex-col bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
          <div className="relative flex-1 flex flex-col p-3 sm:p-4">
            {/* Header - Logo and Title on same line */}
            <div className="text-center mb-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                {/* Logo - use direct path for consistency across all environments */}
                <img 
                  src="/fun-profile-logo-40.webp" 
                  alt="Fun Profile Web3"
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-green-400/50 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                />
                {/* Title - HONOR BOARD - same height as logo */}
                <h1 
                  className="text-2xl sm:text-3xl font-black tracking-wider uppercase leading-none"
                  style={{
                    fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                    background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #fcd34d 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    WebkitTextStroke: '2px white',
                    textShadow: '0 0 30px rgba(250,204,21,0.8), 0 0 60px rgba(250,204,21,0.4)',
                    filter: 'drop-shadow(0 0 10px rgba(250,204,21,0.6))',
                  }}
                >
                  HONOR BOARD
                </h1>
              </div>
              
              {/* User info - Avatar on left, Name on right */}
              <div className="flex items-center justify-center gap-2">
                <Avatar className="w-8 h-8 border-2 border-yellow-400/70 shadow-[0_0_10px_rgba(250,204,21,0.4)]">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-black font-bold text-sm">
                    {username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span 
                  className="text-white font-bold truncate max-w-[150px] drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] text-lg sm:text-xl"
                >
                  {username?.toUpperCase() || 'USER'}
                </span>
              </div>
            </div>

            {/* Two Column Layout - Even vertical spacing */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              {/* Left Column - Posts, Reactions, Comments, Shares */}
              <div className="flex flex-col justify-between space-y-2">
                <StatRow 
                  icon={<ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  label="Posts"
                  value={stats.posts_count}
                />
                <StatRow 
                  icon={<Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  label="Reactions"
                  value={stats.reactions_on_posts}
                />
                <StatRow 
                  icon={<MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  label="Comments"
                  value={stats.comments_count}
                />
                <StatRow 
                  icon={<Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  label="Shares"
                  value={stats.shares_count}
                />
              </div>

              {/* Right Column - Friends, Livestreams, Claimable, Claimed */}
              <div className="flex flex-col justify-between space-y-2">
                <StatRow 
                  icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  label="Friends"
                  value={stats.friends_count}
                />
                <StatRow 
                  icon={<Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  label="Livestream"
                  value={stats.livestreams_count}
                />
                <StatRow 
                  icon={<Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  label="Claimable"
                  value={stats.claimable}
                />
                <StatRow 
                  icon={<Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  label="Claimed"
                  value={stats.claimed}
                />
              </div>
            </div>

            {/* Full Width Total Rows - Even spacing with columns */}
            <div className="mt-3 space-y-2">
              <StatRow 
                icon={<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                label="Today"
                value={stats.today_reward}
              />
              <StatRow 
                icon={<BadgeDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                label="Total Reward"
                value={stats.total_reward}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Standalone Mobile Stats component for use in bottom sheet
interface MobileStatsProps {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export const MobileStats = ({ userId, username, avatarUrl }: MobileStatsProps) => {
  const { stats: rewardStats, isLoading: rewardLoading } = useRewardCalculation(userId);

  const { data: additionalData, isLoading: additionalLoading } = useQuery({
    queryKey: ['profile-additional-stats', userId],
    queryFn: async () => {
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'success');

      const receivedAmount = transactionsData?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
      return { receivedAmount };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const loading = rewardLoading || additionalLoading;

  const stats = {
    posts_count: rewardStats?.postsCount || 0,
    comments_count: rewardStats?.commentsOnPosts || 0,
    reactions_on_posts: rewardStats?.reactionsOnPosts || 0,
    shares_count: rewardStats?.sharesCount || 0,
    friends_count: rewardStats?.friendsCount || 0,
    livestreams_count: rewardStats?.livestreamsCount || 0,
    claimable: rewardStats?.claimableAmount || 0,
    claimed: rewardStats?.claimedAmount || 0,
    today_reward: rewardStats?.todayReward || 0,
    total_reward: rewardStats?.totalReward || 0,
    total_money: (rewardStats?.totalReward || 0) + (additionalData?.receivedAmount || 0),
  };

  const formatNumber = (num: number): string => num.toLocaleString('vi-VN');

  if (loading) {
    return (
      <div className="w-full p-4">
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="rounded-xl overflow-hidden border-2 border-yellow-400 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
        <div className="p-3">
          {/* Header with user info */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Avatar className="w-8 h-8 border-2 border-yellow-400/70">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-black font-bold text-sm">
                {username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-white font-bold text-lg uppercase truncate max-w-[150px]">
              {username || 'USER'}
            </span>
          </div>
          
          {/* Compact 4x2 Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
            <div className="bg-green-800/70 rounded-lg py-1.5 px-1 border border-yellow-500/30">
              <ArrowUp className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-0.5" />
              <div className="text-white font-bold text-xs">{formatNumber(stats.posts_count)}</div>
              <div className="text-yellow-400/80 text-[8px] uppercase">Posts</div>
            </div>
            <div className="bg-green-800/70 rounded-lg py-1.5 px-1 border border-yellow-500/30">
              <Star className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-0.5" />
              <div className="text-white font-bold text-xs">{formatNumber(stats.reactions_on_posts)}</div>
              <div className="text-yellow-400/80 text-[8px] uppercase">Reactions</div>
            </div>
            <div className="bg-green-800/70 rounded-lg py-1.5 px-1 border border-yellow-500/30">
              <MessageCircle className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-0.5" />
              <div className="text-white font-bold text-xs">{formatNumber(stats.comments_count)}</div>
              <div className="text-yellow-400/80 text-[8px] uppercase">Comments</div>
            </div>
            <div className="bg-green-800/70 rounded-lg py-1.5 px-1 border border-yellow-500/30">
              <Users className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-0.5" />
              <div className="text-white font-bold text-xs">{formatNumber(stats.friends_count)}</div>
              <div className="text-yellow-400/80 text-[8px] uppercase">Friends</div>
            </div>
          </div>
          
          {/* Second row: Shares, Livestreams, Claimable, Claimed */}
          <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
            <div className="bg-green-800/70 rounded-lg py-1.5 px-1 border border-yellow-500/30">
              <Share2 className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-0.5" />
              <div className="text-white font-bold text-xs">{formatNumber(stats.shares_count)}</div>
              <div className="text-yellow-400/80 text-[8px] uppercase">Shares</div>
            </div>
            <div className="bg-green-800/70 rounded-lg py-1.5 px-1 border border-yellow-500/30">
              <Video className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-0.5" />
              <div className="text-white font-bold text-xs">{formatNumber(stats.livestreams_count)}</div>
              <div className="text-yellow-400/80 text-[8px] uppercase">Live</div>
            </div>
            <div className="bg-green-800/70 rounded-lg py-1.5 px-1 border border-yellow-500/30">
              <Gift className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-0.5" />
              <div className="text-white font-bold text-xs">{formatNumber(stats.claimable)}</div>
              <div className="text-yellow-400/80 text-[8px] uppercase">Claimable</div>
            </div>
            <div className="bg-green-800/70 rounded-lg py-1.5 px-1 border border-yellow-500/30">
              <Coins className="w-3.5 h-3.5 mx-auto text-yellow-400 mb-0.5" />
              <div className="text-white font-bold text-xs">{formatNumber(stats.claimed)}</div>
              <div className="text-yellow-400/80 text-[8px] uppercase">Claimed</div>
            </div>
          </div>
          
          {/* Total rows */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-yellow-500/20 rounded-lg py-1.5 px-2 border border-yellow-400/50 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-400 font-bold text-[9px] uppercase">Today</span>
              </div>
              <span className="text-white font-bold text-xs">{formatNumber(stats.today_reward)}</span>
            </div>
            <div className="bg-yellow-500/20 rounded-lg py-1.5 px-2 border border-yellow-400/50 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <BadgeDollarSign className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-400 font-bold text-[9px] uppercase">Total</span>
              </div>
              <span className="text-white font-bold text-xs">{formatNumber(stats.total_reward)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
