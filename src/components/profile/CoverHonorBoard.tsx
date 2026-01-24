import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, MessageCircle, Star, Share2, BadgeDollarSign, Coins, Gift, Wallet, Users, Image, Video, Calendar } from 'lucide-react';
import { useRewardCalculation, REWARD_CONFIG } from '@/hooks/useRewardCalculation';
import { useLanguage } from '@/i18n/LanguageContext';

interface CoverHonorBoardProps {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export const CoverHonorBoard = ({ userId, username, avatarUrl }: CoverHonorBoardProps) => {
  const { t, language } = useLanguage();
  
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
    return num.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');
  };

  if (loading) {
    return (
      <div className="w-full">
        <Skeleton className="h-[200px] w-full rounded-2xl" />
      </div>
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
    <div className="flex items-center justify-between py-1.5 px-3 sm:px-4 rounded-full bg-gradient-to-b from-[#1a7d45]/80 via-[#166534]/80 to-[#0d4a2a]/80 backdrop-blur-sm border-[2px] border-[#DAA520] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_6px_rgba(218,165,32,0.3)] overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink min-w-0 overflow-hidden">
        <div className="text-[#E8D5A3] drop-shadow-[0_0_4px_rgba(218,165,32,0.5)] flex-shrink-0">
          {icon}
        </div>
        <span className="text-[#E8D5A3] font-bold text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wide truncate">
          {label}
        </span>
      </div>
      <span className={`text-[#FFD700] font-bold ${getValueFontSize(value)} drop-shadow-[0_0_4px_rgba(255,215,0,0.4)] tabular-nums flex-shrink-0 ml-2`}>
        {formatNumber(value)}
      </span>
    </div>
  );

  return (
    <>
      {/* Desktop: Inline block for profile info section - aligned to right */}
      <div className="w-full flex justify-end">
        {/* Main Container - Glassmorphism */}
        <div className="rounded-2xl overflow-hidden border-2 border-white/30 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] w-full max-w-[420px]">
          <div className="p-3 sm:p-4">
            {/* Header - Avatar and Title */}
            <div className="text-center mb-3">
              <div className="flex items-center justify-center gap-2">
                <Avatar className="w-8 h-8 border-2 border-[#DAA520] shadow-[0_0_12px_rgba(218,165,32,0.6)]">
                  <AvatarImage src={avatarUrl} sizeHint="sm" />
                  <AvatarFallback className="bg-gradient-to-br from-green-600 to-green-800 text-white font-bold text-sm">
                    {username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <h1 
                  className="text-lg font-black tracking-wider uppercase leading-none"
                  style={{
                    fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                    background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #fcd34d 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 20px rgba(250,204,21,0.8)',
                    filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.6))',
                  }}
                >
                  {t('honorBoard').toUpperCase()}
                </h1>
              </div>
            </div>

            {/* Two Column Layout - 6 items (3 per column) */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {/* Left Column */}
              <div className="space-y-1.5 sm:space-y-2">
                <StatRow icon={<ArrowUp className="w-3.5 h-3.5" />} label={t('posts')} value={stats.posts_count} />
                <StatRow icon={<Star className="w-3.5 h-3.5" />} label={t('reactions')} value={stats.reactions_on_posts} />
                <StatRow icon={<MessageCircle className="w-3.5 h-3.5" />} label={t('comments')} value={stats.comments_count} />
              </div>

              {/* Right Column */}
              <div className="space-y-1.5 sm:space-y-2">
                <StatRow icon={<Users className="w-3.5 h-3.5" />} label={t('friends')} value={stats.friends_count} />
                <StatRow icon={<Gift className="w-3.5 h-3.5" />} label={t('claimableReward')} value={stats.claimable} />
                <StatRow icon={<Coins className="w-3.5 h-3.5" />} label={t('claimedReward')} value={stats.claimed} />
              </div>
            </div>

            {/* Total Rows */}
            <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-1.5 sm:gap-2">
              <StatRow icon={<Calendar className="w-3.5 h-3.5" />} label={t('today')} value={stats.today_reward} />
              <StatRow icon={<BadgeDollarSign className="w-3.5 h-3.5" />} label={t('totalReward')} value={stats.total_reward} />
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
  const { t, language } = useLanguage();
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

  const formatNumber = (num: number): string => num.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');
  
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
              <AvatarImage src={avatarUrl} sizeHint="sm" />
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
            <MobileStatCell icon={<ArrowUp className="w-3.5 h-3.5" />} value={stats.posts_count} label={t('posts')} />
            <MobileStatCell icon={<Star className="w-3.5 h-3.5" />} value={stats.reactions_on_posts} label={t('reactions')} />
            <MobileStatCell icon={<MessageCircle className="w-3.5 h-3.5" />} value={stats.comments_count} label={t('comments')} />
            <MobileStatCell icon={<Users className="w-3.5 h-3.5" />} value={stats.friends_count} label={t('friends')} />
          </div>
          
          {/* Second row: Shares, Livestreams, Claimable, Claimed */}
          <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
            <MobileStatCell icon={<Share2 className="w-3.5 h-3.5" />} value={stats.shares_count} label={t('shares')} />
            <MobileStatCell icon={<Video className="w-3.5 h-3.5" />} value={stats.livestreams_count} label={t('liveVideo')} />
            <MobileStatCell icon={<Gift className="w-3.5 h-3.5" />} value={stats.claimable} label={t('claimableReward')} />
            <MobileStatCell icon={<Coins className="w-3.5 h-3.5" />} value={stats.claimed} label={t('claimedReward')} />
          </div>
          
          {/* Total rows */}
          <div className="grid grid-cols-2 gap-1.5">
            <MobileTotalRow icon={<Calendar className="w-3.5 h-3.5" />} label={t('today')} value={stats.today_reward} />
            <MobileTotalRow icon={<BadgeDollarSign className="w-3.5 h-3.5" />} label={t('totalReward')} value={stats.total_reward} />
          </div>
        </div>
      </div>
    </div>
  );
};
