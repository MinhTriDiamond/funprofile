import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, MessageCircle, Star, Share2, BadgeDollarSign, Coins, Gift, Video, Users, Calendar } from 'lucide-react';
import { useRewardCalculation } from '@/hooks/useRewardCalculation';

interface CoverHonorBoardProps {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export const CoverHonorBoard = ({ userId, username, avatarUrl }: CoverHonorBoardProps) => {
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
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 w-[22%] max-w-[280px] min-w-[200px] z-20">
        <Skeleton className="h-[320px] w-full rounded-2xl" />
      </div>
    );
  }

  // Helper to get font size based on number of digits
  const getValueFontSize = (value: number): string => {
    const digits = formatNumber(value).length;
    if (digits <= 4) return 'text-xs';
    if (digits <= 6) return 'text-[11px]';
    if (digits <= 8) return 'text-[10px]';
    return 'text-[9px]';
  };

  // Pill-shaped stat row like AppHonorBoard
  const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="flex items-center gap-2 py-2 px-3 rounded-full bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] border-[2px] border-[#DAA520] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.15),0_0_6px_rgba(218,165,32,0.4)] transition-all duration-300 hover:scale-[1.02]">
      <div className="p-1 rounded-full bg-white/10 shrink-0">
        {icon}
      </div>
      <div className="flex-1 flex items-center justify-between gap-1 min-w-0 overflow-hidden">
        <span className="text-[#E8D5A3] font-semibold text-[9px] uppercase tracking-wide truncate">
          {label}
        </span>
        <span className={`text-[#FFD700] font-bold ${getValueFontSize(value)} drop-shadow-[0_0_4px_rgba(255,215,0,0.4)] tabular-nums flex-shrink-0`}>
          {formatNumber(value)}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: Positioned center-right of cover photo with golden glass background */}
      <div className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 w-[22%] max-w-[280px] min-w-[200px] z-20">
        {/* Main Container with golden glass effect */}
        <div className="rounded-2xl overflow-hidden border-2 border-gold bg-yellow-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(218,165,32,0.3)]">
          {/* Sparkle effects */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-2 left-2 w-1 h-1 bg-gold rounded-full animate-pulse" />
            <div className="absolute top-4 right-4 w-1 h-1 bg-gold rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-6 left-6 w-1 h-1 bg-gold rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative p-3 space-y-2">
            {/* Header - Logo and Title */}
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-2">
                <img 
                  src="/fun-profile-logo-40.webp" 
                  alt="Fun Profile Web3"
                  className="w-7 h-7 rounded-full border-2 border-gold shadow-[0_0_15px_rgba(34,197,94,0.6)]"
                />
                <h1 
                  className="text-base font-black tracking-wider uppercase leading-none"
                  style={{
                    fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                    background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #fcd34d 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 20px rgba(250,204,21,0.8)',
                    filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.6))',
                  }}
                >
                  HONOR BOARD
                </h1>
              </div>
            </div>

            {/* Stats - Single Column Pills */}
            <div className="space-y-1.5">
              <StatRow icon={<ArrowUp className="w-3 h-3 text-[#E8D5A3]" />} label="Posts" value={stats.posts_count} />
              <StatRow icon={<Star className="w-3 h-3 text-[#E8D5A3]" />} label="Reactions" value={stats.reactions_on_posts} />
              <StatRow icon={<MessageCircle className="w-3 h-3 text-[#E8D5A3]" />} label="Comments" value={stats.comments_count} />
              <StatRow icon={<Share2 className="w-3 h-3 text-[#E8D5A3]" />} label="Shares" value={stats.shares_count} />
              <StatRow icon={<Users className="w-3 h-3 text-[#E8D5A3]" />} label="Friends" value={stats.friends_count} />
              <StatRow icon={<Video className="w-3 h-3 text-[#E8D5A3]" />} label="Livestream" value={stats.livestreams_count} />
              <StatRow icon={<Gift className="w-3 h-3 text-[#E8D5A3]" />} label="Claimable" value={stats.claimable} />
              <StatRow icon={<Coins className="w-3 h-3 text-[#E8D5A3]" />} label="Claimed" value={stats.claimed} />
              <StatRow icon={<Calendar className="w-3 h-3 text-[#E8D5A3]" />} label="Today" value={stats.today_reward} />
              <StatRow icon={<BadgeDollarSign className="w-3 h-3 text-[#E8D5A3]" />} label="Total" value={stats.total_reward} />
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
  };

  const formatNumber = (num: number): string => num.toLocaleString('vi-VN');
  
  const getValueFontSize = (value: number): string => {
    const digits = formatNumber(value).length;
    if (digits <= 4) return 'text-xs';
    if (digits <= 6) return 'text-[11px]';
    if (digits <= 8) return 'text-[10px]';
    return 'text-[9px]';
  };

  // Mobile pill stat cell
  const MobileStatCell = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
    <div className="bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] rounded-full py-1.5 px-2 border-[2px] border-[#DAA520] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_4px_rgba(218,165,32,0.3)] flex items-center gap-1.5">
      <div className="p-1 rounded-full bg-white/10 shrink-0">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className={`text-[#FFD700] font-bold ${getValueFontSize(value)} tabular-nums truncate`}>{formatNumber(value)}</span>
        <span className="text-[#E8D5A3]/80 text-[7px] uppercase truncate">{label}</span>
      </div>
    </div>
  );

  // Mobile total row pill
  const MobileTotalRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] rounded-full py-1.5 px-3 border-[2px] border-[#DAA520] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_6px_rgba(218,165,32,0.4)] flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <div className="p-1 rounded-full bg-white/10 shrink-0">{icon}</div>
        <span className="text-[#E8D5A3] font-bold text-[9px] uppercase">{label}</span>
      </div>
      <span className={`text-[#FFD700] font-bold ${getValueFontSize(value)} drop-shadow-[0_0_4px_rgba(255,215,0,0.4)] tabular-nums`}>{formatNumber(value)}</span>
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
      <div className="rounded-xl overflow-hidden border-2 border-gold bg-yellow-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(218,165,32,0.3)]">
        <div className="p-3">
          {/* Header with user info */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Avatar className="w-8 h-8 border-2 border-gold">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-black font-bold text-sm">
                {username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-white font-bold text-lg uppercase truncate max-w-[150px]">
              {username || 'USER'}
            </span>
          </div>
          
          {/* Compact 4x2 Grid with pills */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <MobileStatCell icon={<ArrowUp className="w-3 h-3 text-[#E8D5A3]" />} value={stats.posts_count} label="Posts" />
            <MobileStatCell icon={<Star className="w-3 h-3 text-[#E8D5A3]" />} value={stats.reactions_on_posts} label="Reactions" />
            <MobileStatCell icon={<MessageCircle className="w-3 h-3 text-[#E8D5A3]" />} value={stats.comments_count} label="Comments" />
            <MobileStatCell icon={<Users className="w-3 h-3 text-[#E8D5A3]" />} value={stats.friends_count} label="Friends" />
          </div>
          
          {/* Second row pills */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <MobileStatCell icon={<Share2 className="w-3 h-3 text-[#E8D5A3]" />} value={stats.shares_count} label="Shares" />
            <MobileStatCell icon={<Video className="w-3 h-3 text-[#E8D5A3]" />} value={stats.livestreams_count} label="Live" />
            <MobileStatCell icon={<Gift className="w-3 h-3 text-[#E8D5A3]" />} value={stats.claimable} label="Claimable" />
            <MobileStatCell icon={<Coins className="w-3 h-3 text-[#E8D5A3]" />} value={stats.claimed} label="Claimed" />
          </div>
          
          {/* Total rows pills */}
          <div className="grid grid-cols-2 gap-1.5">
            <MobileTotalRow icon={<Calendar className="w-3 h-3 text-[#E8D5A3]" />} label="Today" value={stats.today_reward} />
            <MobileTotalRow icon={<BadgeDollarSign className="w-3 h-3 text-[#E8D5A3]" />} label="Total" value={stats.total_reward} />
          </div>
        </div>
      </div>
    </div>
  );
};
