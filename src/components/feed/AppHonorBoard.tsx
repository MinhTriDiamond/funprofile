import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Users, FileText, Image, Video, BadgeDollarSign, Coins } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { getNavbarLogoUrl } from '@/lib/staticImageOptimizer';

// Token logos
import camlyLogo from '@/assets/tokens/camly-logo.webp';
import bnbLogo from '@/assets/tokens/bnb-logo.webp';
import usdtLogo from '@/assets/tokens/usdt-logo.webp';
import btcbLogo from '@/assets/tokens/btcb-logo.webp';

const TOKEN_LOGOS: Record<string, string> = {
  CAMLY: camlyLogo,
  BNB: bnbLogo,
  USDT: usdtLogo,
  BTCB: btcbLogo,
};

interface TokenBalance {
  symbol: string;
  amount: number;
  logoPath: string;
}

interface AppStats {
  totalUsers: number;
  totalPosts: number;
  totalPhotos: number;
  totalVideos: number;
  totalRewards: number;
  tokenBalances: TokenBalance[];
}

export const AppHonorBoard = memo(() => {
  const { t } = useLanguage();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['app-honor-board-stats'],
    queryFn: async (): Promise<AppStats> => {
      const [
        appStatsResult,
        rewardClaimsResult, 
        transactionsResult,
      ] = await Promise.all([
        // Use RPC function to get accurate counts
        supabase.rpc('get_app_stats'),
        // All claimed rewards (CAMLY token)
        supabase.from('reward_claims').select('amount'),
        // All transactions with token info
        supabase.from('transactions').select('amount, token_symbol'),
      ]);

      // Get stats from RPC result (returns single row)
      const appStats = appStatsResult.data?.[0] as {
        total_users?: number;
        total_posts?: number;
        total_photos?: number;
        total_videos?: number;
        total_rewards?: number;
      } || {};
      const totalUsers = Number(appStats.total_users) || 0;
      const totalPosts = Number(appStats.total_posts) || 0;
      const totalPhotos = Number(appStats.total_photos) || 0;
      const totalVideos = Number(appStats.total_videos) || 0;
      const totalRewards = Number(appStats.total_rewards) || 0;

      // Calculate total CAMLY from claimed rewards
      const claims = rewardClaimsResult.data || [];
      const claimedCamly = claims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

      // Group transactions by token type
      const transactions = transactionsResult.data || [];
      const transactionsByToken: Record<string, number> = {};
      
      transactions.forEach((t: { amount: string; token_symbol: string }) => {
        const symbol = t.token_symbol?.toUpperCase() || 'CAMLY';
        const amount = Number(t.amount) || 0;
        transactionsByToken[symbol] = (transactionsByToken[symbol] || 0) + amount;
      });

      // Add claimed CAMLY to transactions CAMLY
      transactionsByToken['CAMLY'] = (transactionsByToken['CAMLY'] || 0) + claimedCamly;

      // Build token balances array (only tokens with amount > 0)
      const tokenBalances: TokenBalance[] = [];
      
      // CAMLY first (always show if has any)
      if (transactionsByToken['CAMLY'] > 0) {
        tokenBalances.push({
          symbol: 'CAMLY',
          amount: transactionsByToken['CAMLY'],
          logoPath: TOKEN_LOGOS.CAMLY,
        });
      }

      // Then other tokens in order: USDT, BTCB (BNB excluded per request)
      ['USDT', 'BTCB'].forEach(symbol => {
        if (transactionsByToken[symbol] > 0) {
          tokenBalances.push({
            symbol,
            amount: transactionsByToken[symbol],
            logoPath: TOKEN_LOGOS[symbol] || '',
          });
        }
      });

      return {
        totalUsers,
        totalPosts,
        totalPhotos,
        totalVideos,
        totalRewards,
        tokenBalances
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="fb-card p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  const statItems: Array<{
    icon: typeof Users;
    label: string;
    value: number;
    color: string;
    bgColor: string;
    showCamlyLogo?: boolean;
  }> = [
    {
      icon: Users,
      label: t('totalUsers'),
      value: stats?.totalUsers || 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: FileText,
      label: t('totalPosts'),
      value: stats?.totalPosts || 0,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Image,
      label: t('totalPhotos'),
      value: stats?.totalPhotos || 0,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: Video,
      label: t('totalVideos'),
      value: stats?.totalVideos || 0,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      icon: BadgeDollarSign,
      label: t('totalRewards'),
      value: stats?.totalRewards || 0,
      color: 'text-gold',
      bgColor: 'bg-gold/10',
      showCamlyLogo: true,
    },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-gold bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 shadow-gold-glow">
      {/* Sparkle effects */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-2 left-2 w-1 h-1 bg-gold rounded-full animate-pulse" />
        <div className="absolute top-4 right-4 w-1 h-1 bg-gold rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-6 left-6 w-1 h-1 bg-gold rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative p-3 space-y-3">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img 
              src={getNavbarLogoUrl('/fun-profile-logo-40.webp')} 
              alt="Fun Profile Web3" 
              width={40} 
              height={40} 
              className="w-10 h-10 rounded-full border border-yellow-400 shadow-lg" 
            />
            <h1 
              className="text-xl font-black tracking-wider uppercase" 
              style={{
                fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #fcd34d 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 20px rgba(250,204,21,0.6)',
                filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.5))'
              }}
            >
              {t('honorBoard')}
            </h1>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-2">
          {statItems.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 py-2 px-2.5 rounded-lg border border-yellow-500/40 bg-green-800/90 backdrop-blur-sm"
            >
              <div className={`p-1.5 rounded-md ${item.bgColor}`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate flex items-center gap-1">
                  {formatNumber(item.value)}
                  {item.showCamlyLogo && (
                    <img 
                      src={camlyLogo} 
                      alt="CAMLY" 
                      className="w-4 h-4 inline-block" 
                    />
                  )}
                </p>
                <p className="text-yellow-400/80 text-[9px] uppercase truncate">
                  {item.label}
                </p>
              </div>
            </div>
          ))}

          {/* Dynamic Token Balances - Total Money Section */}
          {stats?.tokenBalances && stats.tokenBalances.length > 0 && (
            stats.tokenBalances.map((token, index) => (
              <div 
                key={token.symbol} 
                className="flex items-center gap-2 py-2 px-2.5 rounded-lg border border-yellow-500/40 bg-green-800/90 backdrop-blur-sm"
              >
                <div className="p-1.5 rounded-md bg-emerald-500/10">
                  <Coins className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate flex items-center gap-1">
                    {formatNumber(token.amount, token.symbol === 'CAMLY' ? 0 : 6)}
                    <img 
                      src={token.logoPath} 
                      alt={token.symbol} 
                      className="w-4 h-4 inline-block" 
                    />
                  </p>
                  <p className="text-yellow-400/80 text-[9px] uppercase truncate">
                    {index === 0 ? t('totalMoney') : `Circulating ${token.symbol}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

AppHonorBoard.displayName = 'AppHonorBoard';
