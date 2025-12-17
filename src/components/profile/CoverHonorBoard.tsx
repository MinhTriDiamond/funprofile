import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, MessageCircle, Star, Share2, BadgeDollarSign, Coins, Gift, Wallet } from 'lucide-react';

interface UserStats {
  posts_count: number;
  comments_count: number;
  reactions_count: number;
  shares_count: number;
  claimable: number;
  claimed: number;
  total_reward: number;
  total_money: number;
}

interface CoverHonorBoardProps {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export const CoverHonorBoard = ({ userId, username, avatarUrl }: CoverHonorBoardProps) => {
  const [stats, setStats] = useState<UserStats>({
    posts_count: 0,
    comments_count: 0,
    reactions_count: 0,
    shares_count: 0,
    claimable: 0,
    claimed: 0,
    total_reward: 0,
    total_money: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, [userId]);

  const fetchUserStats = async () => {
    try {
      // Use the optimized database function get_user_rewards
      const { data: rewardData } = await supabase
        .rpc('get_user_rewards', { limit_count: 1000 })
        .eq('id', userId)
        .maybeSingle();

      // Fetch claimed amount separately
      const { data: claimsData } = await supabase
        .from('reward_claims')
        .select('amount')
        .eq('user_id', userId);

      // Fetch total received (transactions to this user's wallet)
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'success');

      const claimedAmount = claimsData?.reduce((sum, claim) => sum + Number(claim.amount), 0) || 0;
      const receivedAmount = transactionsData?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;

      if (rewardData) {
        const totalReward = Number(rewardData.total_reward) || 0;
        setStats({
          posts_count: Number(rewardData.posts_count) || 0,
          comments_count: Number(rewardData.comments_count) || 0,
          reactions_count: Number(rewardData.reactions_count) || 0,
          shares_count: Number(rewardData.shares_count) || 0,
          claimable: Math.max(0, totalReward - claimedAmount),
          claimed: claimedAmount,
          total_reward: totalReward,
          total_money: totalReward + receivedAmount,
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="absolute right-4 top-4 bottom-4 w-[45%] max-w-[400px]">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    );
  }

  const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg border border-yellow-500/40 bg-green-900/30 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
          {icon}
        </div>
        <span className="text-yellow-400 font-bold text-xs uppercase tracking-wide drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
          {label}
        </span>
      </div>
      <span className="text-white font-bold text-sm drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
        {formatNumber(value)}
      </span>
    </div>
  );

  return (
    <div className="absolute right-2 sm:right-4 top-2 sm:top-4 bottom-2 sm:bottom-4 w-[48%] sm:w-[45%] max-w-[420px] min-w-[280px]">
      {/* Main Container - Dark Glassmorphism */}
      <div className="h-full rounded-2xl overflow-hidden border-2 border-yellow-500/70 bg-gradient-to-br from-green-900/80 via-green-800/70 to-black/80 backdrop-blur-md shadow-[0_0_30px_rgba(34,197,94,0.3),0_0_60px_rgba(250,204,21,0.2)]">
        
        {/* Sparkle effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-3 left-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-60" />
          <div className="absolute top-6 right-6 w-1 h-1 bg-yellow-300 rounded-full animate-pulse opacity-70" style={{ animationDelay: '0.3s' }} />
          <div className="absolute bottom-8 left-8 w-1 h-1 bg-green-300 rounded-full animate-pulse opacity-60" style={{ animationDelay: '0.6s' }} />
          <div className="absolute bottom-4 right-10 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.9s' }} />
          <div className="absolute top-1/2 left-4 w-1 h-1 bg-yellow-200 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1.2s' }} />
        </div>

        {/* Inner glow border */}
        <div className="absolute inset-0 rounded-2xl border border-green-400/20 pointer-events-none" />

        <div className="relative h-full flex flex-col p-3 sm:p-4">
          {/* Header */}
          <div className="text-center space-y-1 mb-3">
            {/* Logo */}
            <div className="flex justify-center">
              <img 
                src="/fun-profile-logo-40.webp" 
                alt="Fun Profile Web3"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-green-400/50 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
              />
            </div>
            
            {/* Title - HONOR BOARD */}
            <h1 
              className="text-xl sm:text-2xl font-black tracking-wider uppercase"
              style={{
                fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #fcd34d 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 30px rgba(250,204,21,0.8), 0 0 60px rgba(250,204,21,0.4)',
                filter: 'drop-shadow(0 0 10px rgba(250,204,21,0.6))',
              }}
            >
              HONOR BOARD
            </h1>
            
            {/* User info */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-white text-sm font-semibold truncate max-w-[120px]">
                {username?.toUpperCase() || 'USER'}
              </span>
              <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-yellow-400/70 shadow-[0_0_10px_rgba(250,204,21,0.4)]">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-black font-bold text-xs">
                  {username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 overflow-hidden">
            {/* Left Column - Activity Stats */}
            <div className="space-y-1.5 sm:space-y-2">
              <h3 className="text-[10px] sm:text-xs text-green-300/80 font-semibold uppercase tracking-wider text-center mb-1">
                Activity
              </h3>
              <StatRow 
                icon={<ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                label="Posts"
                value={stats.posts_count}
              />
              <StatRow 
                icon={<Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                label="Reactions"
                value={stats.reactions_count}
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

            {/* Right Column - Financial Stats */}
            <div className="space-y-1.5 sm:space-y-2">
              <h3 className="text-[10px] sm:text-xs text-yellow-300/80 font-semibold uppercase tracking-wider text-center mb-1">
                Rewards
              </h3>
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
              <StatRow 
                icon={<BadgeDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                label="Total Reward"
                value={stats.total_reward}
              />
              <StatRow 
                icon={<Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                label="Total Money"
                value={stats.total_money}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
