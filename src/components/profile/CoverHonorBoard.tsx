import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, MessageCircle, Star, Share2, BadgeDollarSign, Coins, Gift, Wallet, Users, Image } from 'lucide-react';

interface UserStats {
  posts_count: number;
  comments_count: number;
  reactions_on_posts: number;
  shares_count: number;
  friends_count: number;
  nfts_count: number;
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
    reactions_on_posts: 0,
    shares_count: 0,
    friends_count: 0,
    nfts_count: 0,
    claimable: 0,
    claimed: 0,
    total_reward: 0,
    total_money: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, [userId]);

  // New reward calculation formula
  const calculateTotalReward = (
    postsCount: number,
    reactionsOnPosts: number,
    commentsOnPosts: number,
    sharesCount: number,
    friendsCount: number
  ): number => {
    // Posts: 1 post = 20,000 CAMLY
    const postsReward = postsCount * 20000;
    
    // Reactions on posts: 3+ reactions = 30,000, then +1,000 per additional
    let reactionsReward = 0;
    if (reactionsOnPosts >= 3) {
      reactionsReward = 30000 + (reactionsOnPosts - 3) * 1000;
    }
    
    // Comments on posts: 1 comment = 5,000 CAMLY
    const commentsReward = commentsOnPosts * 5000;
    
    // Shares: 1 share = 5,000 CAMLY
    const sharesReward = sharesCount * 5000;
    
    // Friends: 1 friend = 10,000 CAMLY + new user bonus 10,000
    const friendsReward = friendsCount * 10000 + 10000;
    
    return postsReward + reactionsReward + commentsReward + sharesReward + friendsReward;
  };

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

      // Fetch comments on user's posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);
      
      let commentsOnPosts = 0;
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { count } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .in('post_id', postIds);
        commentsOnPosts = count || 0;
      }

      const claimedAmount = claimsData?.reduce((sum, claim) => sum + Number(claim.amount), 0) || 0;
      const receivedAmount = transactionsData?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;

      if (rewardData) {
        const postsCount = Number(rewardData.posts_count) || 0;
        const reactionsOnPosts = Number(rewardData.reactions_on_posts) || 0;
        const sharesCount = Number(rewardData.shares_count) || 0;
        const friendsCount = Number(rewardData.friends_count) || 0;
        
        const totalReward = calculateTotalReward(
          postsCount,
          reactionsOnPosts,
          commentsOnPosts,
          sharesCount,
          friendsCount
        );
        
        setStats({
          posts_count: postsCount,
          comments_count: commentsOnPosts,
          reactions_on_posts: reactionsOnPosts,
          shares_count: sharesCount,
          friends_count: friendsCount,
          nfts_count: 0, // NFTs not implemented yet
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
      <div className="absolute right-2 sm:right-3 top-2 sm:top-3 bottom-2 sm:bottom-3 w-[50%] max-w-[500px]">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    );
  }

  const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="flex items-center justify-between py-1 px-2 rounded-lg border border-yellow-500/40 bg-green-800/90 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <div className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
          {icon}
        </div>
        <span className="text-yellow-400 font-bold text-[10px] sm:text-xs uppercase tracking-wide drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
          {label}
        </span>
      </div>
      <span className="text-white font-bold text-xs sm:text-sm drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
        {formatNumber(value)}
      </span>
    </div>
  );

  return (
    <div className="absolute right-2 sm:right-3 top-2 sm:top-3 bottom-2 sm:bottom-3 w-[50%] max-w-[500px] min-w-[300px]">
      {/* Main Container - Fully transparent with gold border */}
      <div className="h-full rounded-2xl overflow-hidden border-2 border-yellow-400">
        <div className="relative h-full flex flex-col p-2 sm:p-3">
          {/* Header - Logo and Title on same line */}
          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              {/* Logo */}
              <img 
                src="/fun-profile-logo-40.webp" 
                alt="Fun Profile Web3"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-green-400/50 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
              />
              {/* Title - HONOR BOARD - same height as logo */}
              <h1 
                className="text-2xl sm:text-3xl font-black tracking-wider uppercase leading-none"
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
            </div>
            
            {/* User info - Name on left, Avatar on right */}
            <div className="flex items-center justify-center gap-2">
              <span 
                className="text-white font-bold truncate max-w-[150px] drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
                style={{ fontSize: '1.5rem', lineHeight: '2rem' }}
              >
                {username?.toUpperCase() || 'USER'}
              </span>
              <Avatar className="w-8 h-8 border-2 border-yellow-400/70 shadow-[0_0_10px_rgba(250,204,21,0.4)]">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-black font-bold text-sm">
                  {username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 flex-1">
            {/* Left Column - Posts, Reactions, Comments, Shares */}
            <div className="space-y-1 sm:space-y-1.5">
              <StatRow 
                icon={<ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                label="Posts"
                value={stats.posts_count}
              />
              <StatRow 
                icon={<Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                label="Reactions"
                value={stats.reactions_on_posts}
              />
              <StatRow 
                icon={<MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                label="Comments"
                value={stats.comments_count}
              />
              <StatRow 
                icon={<Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                label="Shares"
                value={stats.shares_count}
              />
            </div>

            {/* Right Column - Friends, NFTs, Claimable, Claimed */}
            <div className="space-y-1 sm:space-y-1.5">
              <StatRow 
                icon={<Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                label="Friends"
                value={stats.friends_count}
              />
              <StatRow 
                icon={<Image className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                label="NFTs"
                value={stats.nfts_count}
              />
              <StatRow 
                icon={<Gift className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                label="Claimable"
                value={stats.claimable}
              />
              <StatRow 
                icon={<Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                label="Claimed"
                value={stats.claimed}
              />
            </div>
          </div>

          {/* Full Width Total Rows */}
          <div className="mt-1.5 sm:mt-2 space-y-1 sm:space-y-1.5">
            <StatRow 
              icon={<BadgeDollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              label="Total Reward"
              value={stats.total_reward}
            />
            <StatRow 
              icon={<Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              label="Total Money"
              value={stats.total_money}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
