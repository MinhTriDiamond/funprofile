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
        {/* Desktop: positioned at bottom right corner of cover photo */}
        <div className="hidden md:block absolute right-4 bottom-16 w-[22%] max-w-[280px] min-w-[200px] z-20">
          <Skeleton className="h-[200px] w-full rounded-2xl" />
        </div>
      </>
    );
  }

  // Helper to get font size based on number of digits
  const getValueFontSize = (value: number): string => {
    const digits = formatNumber(value).length;
    if (digits <= 4) return 'text-[11px] sm:text-xs md:text-sm';
    if (digits <= 6) return 'text-[10px] sm:text-[11px] md:text-xs';
    if (digits <= 8) return 'text-[9px] sm:text-[10px] md:text-[11px]';
    return 'text-[8px] sm:text-[9px] md:text-[10px]';
  };

  const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="flex items-center justify-between py-1 px-2 sm:px-2.5 rounded-lg bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] border-[2px] border-[#DAA520] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_6px_rgba(218,165,32,0.3)] overflow-hidden">
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink min-w-0 overflow-hidden">
        <div className="text-[#E8D5A3] drop-shadow-[0_0_4px_rgba(218,165,32,0.5)] flex-shrink-0">
          {icon}
        </div>
        <span className="text-[#E8D5A3] font-bold text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wide truncate">
          {label}
        </span>
      </div>
      <span className={`text-[#FFD700] font-bold ${getValueFontSize(value)} drop-shadow-[0_0_4px_rgba(255,215,0,0.4)] tabular-nums flex-shrink-0 ml-1`}>
        {formatNumber(value)}
      </span>
    </div>
  );

  return (
    <>
      {/* Desktop: Positioned at bottom right corner of cover photo, balanced with cover */}
      <div className="hidden md:block absolute right-4 bottom-16 w-[22%] max-w-[280px] min-w-[200px] z-20">
        {/* Main Container - Golden glass aesthetic */}
        <div className="rounded-xl overflow-hidden border-2 border-[#DAA520] bg-yellow-500/20 backdrop-blur-md shadow-2xl">
          <div className="p-2">
            {/* Header - Compact */}
            <div className="text-center mb-1.5">
              <div className="flex items-center justify-center gap-1.5">
                <img 
                  src="/fun-profile-logo-40.webp" 
                  alt="Fun Profile Web3"
                  className="w-5 h-5 rounded-full border border-green-400/50 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                />
                <h1 
                  className="text-sm font-black tracking-wider uppercase leading-none"
                  style={{
                    fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                    background: 'linear-gradient(135deg, #FFD700 0%, #DAA520 50%, #FFD700 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.6))',
                  }}
                >
                  HONOR BOARD
                </h1>
              </div>
            </div>

            {/* Two Column Layout - Pill-shaped capsules */}
            <div className="grid grid-cols-2 gap-0.5">
              {/* Left Column */}
              <div className="space-y-0.5">
                <StatRow icon={<ArrowUp className="w-2.5 h-2.5" />} label="Posts" value={stats.posts_count} />
                <StatRow icon={<Star className="w-2.5 h-2.5" />} label="Reactions" value={stats.reactions_on_posts} />
                <StatRow icon={<MessageCircle className="w-2.5 h-2.5" />} label="Comments" value={stats.comments_count} />
                <StatRow icon={<Share2 className="w-2.5 h-2.5" />} label="Shares" value={stats.shares_count} />
              </div>

              {/* Right Column */}
              <div className="space-y-0.5">
                <StatRow icon={<Users className="w-2.5 h-2.5" />} label="Friends" value={stats.friends_count} />
                <StatRow icon={<Video className="w-2.5 h-2.5" />} label="Live" value={stats.livestreams_count} />
                <StatRow icon={<Gift className="w-2.5 h-2.5" />} label="Claim" value={stats.claimable} />
                <StatRow icon={<Coins className="w-2.5 h-2.5" />} label="Claimed" value={stats.claimed} />
              </div>
            </div>

            {/* Total Rows */}
            <div className="mt-0.5 grid grid-cols-2 gap-0.5">
              <StatRow icon={<Calendar className="w-2.5 h-2.5" />} label="Today" value={stats.today_reward} />
              <StatRow icon={<BadgeDollarSign className="w-2.5 h-2.5" />} label="Total" value={stats.total_reward} />
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
  
  // Helper to get font size based on number of digits for mobile
  const getValueFontSize = (value: number): string => {
    const digits = formatNumber(value).length;
    if (digits <= 4) return 'text-xs';
    if (digits <= 6) return 'text-[11px]';
    if (digits <= 8) return 'text-[10px]';
    return 'text-[9px]';
  };

  // Mobile stat cell with auto-scaling font
  const MobileStatCell = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
    <div className="bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] rounded-lg py-1.5 px-1 border-[2px] border-[#DAA520] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_4px_rgba(218,165,32,0.3)] overflow-hidden">
      <div className="mx-auto text-[#E8D5A3] mb-0.5 flex justify-center">{icon}</div>
      <div className={`text-[#FFD700] font-bold ${getValueFontSize(value)} tabular-nums truncate`}>{formatNumber(value)}</div>
      <div className="text-[#E8D5A3]/80 text-[8px] uppercase truncate">{label}</div>
    </div>
  );

  // Mobile total row with auto-scaling font
  const MobileTotalRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] rounded-lg py-1.5 px-2 border-[2px] border-[#DAA520] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_6px_rgba(218,165,32,0.4)] flex items-center justify-between overflow-hidden">
      <div className="flex items-center gap-1 flex-shrink min-w-0">
        <div className="text-[#E8D5A3] flex-shrink-0">{icon}</div>
        <span className="text-[#E8D5A3] font-bold text-[9px] uppercase truncate">{label}</span>
      </div>
      <span className={`text-[#FFD700] font-bold ${getValueFontSize(value)} drop-shadow-[0_0_4px_rgba(255,215,0,0.4)] tabular-nums flex-shrink-0 ml-1`}>{formatNumber(value)}</span>
    </div>
  );

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
            <MobileStatCell icon={<ArrowUp className="w-3.5 h-3.5" />} value={stats.posts_count} label="Posts" />
            <MobileStatCell icon={<Star className="w-3.5 h-3.5" />} value={stats.reactions_on_posts} label="Reactions" />
            <MobileStatCell icon={<MessageCircle className="w-3.5 h-3.5" />} value={stats.comments_count} label="Comments" />
            <MobileStatCell icon={<Users className="w-3.5 h-3.5" />} value={stats.friends_count} label="Friends" />
          </div>
          
          {/* Second row: Shares, Livestreams, Claimable, Claimed */}
          <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
            <MobileStatCell icon={<Share2 className="w-3.5 h-3.5" />} value={stats.shares_count} label="Shares" />
            <MobileStatCell icon={<Video className="w-3.5 h-3.5" />} value={stats.livestreams_count} label="Live" />
            <MobileStatCell icon={<Gift className="w-3.5 h-3.5" />} value={stats.claimable} label="Claimable" />
            <MobileStatCell icon={<Coins className="w-3.5 h-3.5" />} value={stats.claimed} label="Claimed" />
          </div>
          
          {/* Total rows */}
          <div className="grid grid-cols-2 gap-1.5">
            <MobileTotalRow icon={<Calendar className="w-3.5 h-3.5" />} label="Today" value={stats.today_reward} />
            <MobileTotalRow icon={<BadgeDollarSign className="w-3.5 h-3.5" />} label="Total" value={stats.total_reward} />
          </div>
        </div>
      </div>
    </div>
  );
};
