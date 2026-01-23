import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Users, FileText, Image, Video, BadgeDollarSign, Coins } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
// Use direct paths for logos to ensure consistency across all environments

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
    <div className="relative">
      {/* Ribbon Banner Container */}
      <div className="relative">
        {/* Main Ribbon Body */}
        <div 
          className="relative bg-gradient-to-b from-[#1a5a2e] via-[#166534] to-[#14532d] border-2 border-[#C9A84C] rounded-t-lg shadow-lg"
          style={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 15px rgba(201,168,76,0.3)'
          }}
        >
          {/* Golden Edge Lines */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#FFD700] via-[#C9A84C] to-[#FFD700]" />
          <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#FFD700] via-[#C9A84C] to-[#FFD700]" />
          
          {/* Inner Content */}
          <div className="relative p-4 space-y-3">
            {/* Header with Crown */}
            <div className="text-center">
              <div className="flex flex-col items-center gap-1">
                {/* Crown Icon */}
                <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.6))' }}>👑</span>
                <img 
                  src="/fun-profile-logo-40.webp" 
                  alt="Fun Profile Web3" 
                  width={48} 
                  height={48} 
                  className="w-12 h-12 rounded-full border-2 border-[#FFD700] shadow-lg" 
                />
                <h3 
                  className="font-black text-xl tracking-wider uppercase mt-1"
                  style={{
                    fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFC125 25%, #DAA520 50%, #FFC125 75%, #FFD700 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 20px rgba(255,215,0,0.6)',
                    filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.5))'
                  }}
                >
                  {t('honorBoard')}
                </h3>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="space-y-2">
              {statItems.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 py-2.5 px-4 rounded-full bg-gradient-to-r from-[#1a5a2e] via-[#22863a] to-[#1a5a2e] border border-[#C9A84C] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  style={{
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 6px rgba(201,168,76,0.2)'
                  }}
                >
                  <div className={`p-1.5 rounded-full ${item.bgColor} shrink-0`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                    <p className="text-[#C9A84C] text-xs uppercase font-semibold whitespace-nowrap">
                      {item.label}
                    </p>
                    <p className="text-[#FFD700] font-bold text-sm flex items-center gap-1 shrink-0">
                      {formatNumber(item.value)}
                      {item.showCamlyLogo && (
                        <img 
                          src={camlyLogo} 
                          alt="CAMLY" 
                          className="w-4 h-4 inline-block" 
                        />
                      )}
                    </p>
                  </div>
                </div>
              ))}

              {/* Dynamic Token Balances */}
              {stats?.tokenBalances && stats.tokenBalances.length > 0 && (
                stats.tokenBalances.map((token, index) => (
                  <div 
                    key={token.symbol} 
                    className="flex items-center gap-3 py-2.5 px-4 rounded-full bg-gradient-to-r from-[#1a5a2e] via-[#22863a] to-[#1a5a2e] border border-[#C9A84C] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                    style={{
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 6px rgba(201,168,76,0.2)'
                    }}
                  >
                    <div className="p-1.5 rounded-full bg-emerald-500/10 shrink-0">
                      <Coins className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                      <p className="text-[#C9A84C] text-xs uppercase font-semibold whitespace-nowrap">
                        {index === 0 ? t('totalMoney') : `Circulating ${token.symbol}`}
                      </p>
                      <p className="text-[#FFD700] font-bold text-sm flex items-center gap-1 shrink-0">
                        {formatNumber(token.amount, token.symbol === 'CAMLY' ? 0 : 6)}
                        <img 
                          src={token.logoPath} 
                          alt={token.symbol} 
                          className="w-4 h-4 inline-block" 
                        />
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Ribbon Tail (V-shape bottom) */}
        <div className="relative h-8 overflow-hidden">
          {/* Left tail */}
          <div 
            className="absolute left-0 top-0 w-1/2 h-full bg-gradient-to-br from-[#166534] to-[#14532d]"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 0)',
              borderLeft: '2px solid #C9A84C'
            }}
          />
          {/* Right tail */}
          <div 
            className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-bl from-[#166534] to-[#14532d]"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 100%)',
              borderRight: '2px solid #C9A84C'
            }}
          />
          {/* Center V golden edge */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 top-0 w-4 h-full"
            style={{
              background: 'linear-gradient(180deg, #C9A84C 0%, transparent 100%)'
            }}
          />
        </div>
      </div>
    </div>
  );
});

AppHonorBoard.displayName = 'AppHonorBoard';
