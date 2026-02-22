import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Users, FileText, Image, Video, BadgeDollarSign, Wallet, Coins } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

import camlyLogo from '@/assets/tokens/camly-logo.webp';

interface AppStats {
  totalUsers: number;
  totalPosts: number;
  totalPhotos: number;
  totalVideos: number;
  totalRewards: number;
  treasuryReceived: number;
  totalCamlyClaimed: number;
}

export const AppHonorBoard = memo(() => {
  const { t } = useLanguage();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['app-honor-board-stats'],
    queryFn: async (): Promise<AppStats> => {
      const { data, error } = await supabase.rpc('get_app_stats');
      if (error) throw error;

      const row = (data as any)?.[0] || {};
      const totalUsers = Number(row.total_users) || 0;
      const totalPosts = Number(row.total_posts) || 0;
      const totalPhotos = Number(row.total_photos) || 0;
      const totalVideos = Number(row.total_videos) || 0;
      const totalRewards = Number(row.total_rewards) || 0;
      const treasuryReceived = Number(row.treasury_camly_received) || 0;
      const totalCamlyClaimed = Number(row.total_camly_claimed) || 0;

      return { totalUsers, totalPosts, totalPhotos, totalVideos, totalRewards, treasuryReceived, totalCamlyClaimed };
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
    {
      icon: Wallet,
      label: t('treasuryReceived'),
      value: stats?.treasuryReceived || 0,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      showCamlyLogo: true,
    },
    {
      icon: Coins,
      label: t('totalCamlyClaimed'),
      value: stats?.totalCamlyClaimed || 0,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      showCamlyLogo: true,
    },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-gold/60 bg-card/70 shadow-lg">
      <div className="relative p-3 space-y-3">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img 
              src="/fun-profile-logo-40.webp" 
              alt="Fun Profile Web3" 
              width={40} 
              height={40} 
              className="w-10 h-10 rounded-full border border-gold/50" 
            />
          <h3 
              className="font-black text-[22px] tracking-wider uppercase"
              style={{
                fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                background: 'linear-gradient(90deg, #FF6B9D 0%, #C44FE2 15%, #7B68EE 30%, #00CED1 50%, #98FB98 70%, #FFFF00 85%, #FFB347 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(1px 1px 0px rgba(255,255,255,0.5)) drop-shadow(0 0 8px rgba(255, 182, 193, 0.5))',
              }}
            >
              {t('honorBoard')}
            </h3>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-2">
          {statItems.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 py-2.5 px-4 rounded-full bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] border-[3px] border-[#D4AF37] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className="p-1.5 rounded-full bg-white/10 shrink-0">
                <item.icon className="w-4 h-4 text-[#F5E6C8]" />
              </div>
              <div className="flex-1 flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                <span className="text-[#F5E6C8] text-[10px] sm:text-xs uppercase font-semibold truncate flex-shrink min-w-0">
                  {item.label}
                </span>
                <span className="text-[#FFD700] font-bold text-[11px] sm:text-sm flex items-center gap-1 flex-shrink-0">
                  <span className="tabular-nums">{formatNumber(item.value)}</span>
                  {item.showCamlyLogo && (
                    <img 
                      src={camlyLogo} 
                      alt="CAMLY" 
                      className="w-4 h-4 inline-block flex-shrink-0" 
                    />
                  )}
                </span>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
});

AppHonorBoard.displayName = 'AppHonorBoard';
