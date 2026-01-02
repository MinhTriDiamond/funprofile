import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Users, FileText, Image, Video, BadgeDollarSign, DollarSign } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

// Token prices from CoinGecko + fixed CAMLY price
const COINGECKO_IDS = {
  BNB: 'binancecoin',
  BTCB: 'bitcoin',
  USDT: 'tether',
};

const CAMLY_PRICE_USD = 0.000004;

interface AppStats {
  totalUsers: number;
  totalPosts: number;
  totalPhotos: number;
  totalVideos: number;
  totalRewards: number;
  totalMoneyUsd: number;
}
export const AppHonorBoard = memo(() => {
  const {
    t
  } = useLanguage();
  const {
    data: stats,
    isLoading
  } = useQuery({
    queryKey: ['app-honor-board-stats'],
    queryFn: async (): Promise<AppStats> => {
      // Fetch all stats and token prices in parallel
      const [
        usersResult, 
        postsResult, 
        rewardClaimsResult, 
        transactionsResult,
        reactionsResult,
        commentsResult,
        friendshipsResult,
        sharesResult,
        pricesResponse
      ] = await Promise.all([
        // Total users
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        // Posts with media counts
        supabase.from('posts').select('id, user_id, image_url, video_url, media_urls'),
        // All claimed rewards (CAMLY token)
        supabase.from('reward_claims').select('amount'),
        // All transactions with token info
        supabase.from('transactions').select('amount, token_symbol'),
        // All reactions for calculating claimable rewards
        supabase.from('reactions').select('post_id'),
        // All comments for calculating claimable rewards  
        supabase.from('comments').select('post_id'),
        // All friendships for calculating claimable rewards
        supabase.from('friendships').select('user_id, friend_id, status'),
        // All shares for calculating claimable rewards
        supabase.from('shared_posts').select('original_post_id'),
        // Fetch token prices from CoinGecko
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(COINGECKO_IDS).join(',')}&vs_currencies=usd`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      ]);

      // Parse token prices with fallbacks
      const tokenPrices: Record<string, number> = {
        CAMLY: CAMLY_PRICE_USD,
        BNB: pricesResponse?.[COINGECKO_IDS.BNB]?.usd || 700,
        USDT: pricesResponse?.[COINGECKO_IDS.USDT]?.usd || 1,
        BTCB: pricesResponse?.[COINGECKO_IDS.BTCB]?.usd || 100000,
      };

      const totalUsers = usersResult.count || 0;
      const posts = postsResult.data || [];

      // Count photos and videos from posts
      let totalPhotos = 0;
      let totalVideos = 0;
      posts.forEach(post => {
        if (post.image_url) totalPhotos++;
        if (post.video_url) totalVideos++;
        if (post.media_urls && Array.isArray(post.media_urls)) {
          post.media_urls.forEach((media: any) => {
            if (media.type === 'image') totalPhotos++;
            else if (media.type === 'video') totalVideos++;
          });
        }
      });

      // Calculate total rewards using the same formula as useRewardCalculation
      // For each user: postsReward + reactionsReward + commentsReward + sharesReward + friendsReward + newUserBonus
      const reactions = reactionsResult.data || [];
      const comments = commentsResult.data || [];
      const friendships = friendshipsResult.data || [];
      const shares = sharesResult.data || [];
      const claims = rewardClaimsResult.data || [];

      // Group data by user for calculation
      const userPostIds = new Map<string, string[]>();
      posts.forEach(post => {
        const existing = userPostIds.get(post.user_id) || [];
        existing.push(post.id);
        userPostIds.set(post.user_id, existing);
      });

      let totalRewards = 0;
      
      // For each user, calculate their total reward
      const uniqueUserIds = new Set<string>();
      posts.forEach(p => uniqueUserIds.add(p.user_id));
      friendships.forEach(f => {
        if (f.status === 'accepted') {
          uniqueUserIds.add(f.user_id);
          uniqueUserIds.add(f.friend_id);
        }
      });

      uniqueUserIds.forEach(userId => {
        const userPostIdList = userPostIds.get(userId) || [];
        const postsCount = userPostIdList.length;
        
        // Count reactions on user's posts
        const reactionsOnPosts = reactions.filter(r => userPostIdList.includes(r.post_id)).length;
        
        // Count comments on user's posts
        const commentsOnPosts = comments.filter(c => userPostIdList.includes(c.post_id)).length;
        
        // Count shares of user's posts
        const sharesCount = shares.filter(s => userPostIdList.includes(s.original_post_id)).length;
        
        // Count friends
        const friendsCount = friendships.filter(
          f => f.status === 'accepted' && (f.user_id === userId || f.friend_id === userId)
        ).length;

        // Calculate reward using the same formula
        const postsReward = postsCount * 20000;
        let reactionsReward = 0;
        if (reactionsOnPosts >= 3) {
          reactionsReward = 30000 + (reactionsOnPosts - 3) * 1000;
        }
        const commentsReward = commentsOnPosts * 5000;
        const sharesReward = sharesCount * 5000;
        const friendsReward = friendsCount * 10000 + 10000; // +10k new user bonus

        totalRewards += postsReward + reactionsReward + commentsReward + sharesReward + friendsReward;
      });

      // Calculate total money in USD
      // 1. Sum claimed rewards (CAMLY) and convert to USD
      const claimedCamly = claims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const claimedUsd = claimedCamly * tokenPrices.CAMLY;

      // 2. Sum transactions by token type and convert each to USD
      const transactions = transactionsResult.data || [];
      const transactionsByToken: Record<string, number> = {};
      
      transactions.forEach((t: { amount: string; token_symbol: string }) => {
        const symbol = t.token_symbol?.toUpperCase() || 'CAMLY';
        const amount = Number(t.amount) || 0;
        transactionsByToken[symbol] = (transactionsByToken[symbol] || 0) + amount;
      });

      // Convert each token total to USD
      let transactionsUsd = 0;
      Object.entries(transactionsByToken).forEach(([symbol, amount]) => {
        const price = tokenPrices[symbol] || CAMLY_PRICE_USD;
        transactionsUsd += amount * price;
      });

      const totalMoneyUsd = claimedUsd + transactionsUsd;

      return {
        totalUsers,
        totalPosts: posts.length,
        totalPhotos,
        totalVideos,
        totalRewards,
        totalMoneyUsd
      };
    },
    staleTime: 5 * 60 * 1000,
    // 5 minutes
    gcTime: 10 * 60 * 1000,
    // 10 minutes
    refetchOnWindowFocus: false
  });
  if (isLoading) {
    return <div className="fb-card p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>;
  }
  const statItems: Array<{
    icon: typeof Users;
    label: string;
    value: number;
    color: string;
    bgColor: string;
    isUsd?: boolean;
  }> = [{
    icon: Users,
    label: t('totalUsers'),
    value: stats?.totalUsers || 0,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    isUsd: false
  }, {
    icon: FileText,
    label: t('totalPosts'),
    value: stats?.totalPosts || 0,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    isUsd: false
  }, {
    icon: Image,
    label: t('totalPhotos'),
    value: stats?.totalPhotos || 0,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    isUsd: false
  }, {
    icon: Video,
    label: t('totalVideos'),
    value: stats?.totalVideos || 0,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    isUsd: false
  }, {
    icon: BadgeDollarSign,
    label: t('totalRewards'),
    value: stats?.totalRewards || 0,
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    isUsd: false
  }, {
    icon: DollarSign,
    label: t('totalMoney'),
    value: stats?.totalMoneyUsd || 0,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    isUsd: true
  }];
  return <div className="rounded-2xl overflow-hidden border-2 border-gold bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 shadow-gold-glow">
      {/* Sparkle effects */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-2 left-2 w-1 h-1 bg-gold rounded-full animate-pulse" />
        <div className="absolute top-4 right-4 w-1 h-1 bg-gold rounded-full animate-pulse" style={{
        animationDelay: '0.5s'
      }} />
        <div className="absolute bottom-6 left-6 w-1 h-1 bg-gold rounded-full animate-pulse" style={{
        animationDelay: '1s'
      }} />
      </div>

      <div className="relative p-3 space-y-3">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src="/fun-profile-logo-40.webp" alt="Fun Profile Web3" width={40} height={40} className="w-10 h-10 rounded-full border border-yellow-400 shadow-lg" />
            <h1 className="text-xl font-black tracking-wider uppercase" style={{
            fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
            background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #fcd34d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(250,204,21,0.6)',
            filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.5))'
          }}>
              {t('honorBoard')}
            </h1>
          </div>
          
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-2">
          {statItems.map((item, index) => <div key={index} className="flex items-center gap-2 py-2 px-2.5 rounded-lg border border-yellow-500/40 bg-green-800/90 backdrop-blur-sm">
              <div className={`p-1.5 rounded-md ${item.bgColor}`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">
                  {item.isUsd ? `$ ${formatNumber(item.value, 2)}` : formatNumber(item.value)}
                </p>
                <p className="text-yellow-400/80 text-[9px] uppercase truncate">
                  {item.label}
                </p>
              </div>
            </div>)}
        </div>
      </div>
    </div>;
});
AppHonorBoard.displayName = 'AppHonorBoard';