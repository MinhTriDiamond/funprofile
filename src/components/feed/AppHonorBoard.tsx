import { memo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Users, FileText, Image, Video, BadgeDollarSign, Coins, Radio, LucideIcon } from 'lucide-react';
import { useCapabilities } from '@/hooks/useCapabilities';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/formatters';

import camlyLogo from '@/assets/tokens/camly-logo.webp';
import { ClaimHistoryModal } from './ClaimHistoryModal';
import { NewMembersModal } from './NewMembersModal';
import { ContentStatsModal, ContentStatsType } from './ContentStatsModal';

interface AppStats {
  totalUsers: number;
  totalPosts: number;
  totalPhotos: number;
  totalVideos: number;
  totalLivestreams: number;
  totalRewards: number;
  totalCamlyClaimed: number;
}

type ModalType = 'members' | 'claimed' | ContentStatsType | null;

export const AppHonorBoard = memo(() => {
  const { t } = useLanguage();
  const { isAdmin } = useCapabilities();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const handleStatClick = (modalType: ModalType) => {
    setActiveModal(modalType);
  };
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['app-honor-board-stats'],
    queryFn: async (): Promise<AppStats> => {
      const { data, error } = await supabase.rpc('get_app_stats');
      if (error) throw error;

      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null ?? {};
      const totalUsers = Number(row.total_users) || 0;
      const totalPosts = Number(row.total_posts) || 0;
      const totalPhotos = Number(row.total_photos) || 0;
      const totalVideos = Number(row.total_videos) || 0;
      const totalLivestreams = Number(row.total_livestreams) || 0;
      const totalRewards = Number(row.total_rewards) || 0;
      const totalCamlyClaimed = Number(row.total_camly_claimed) || 0;

      return { totalUsers, totalPosts, totalPhotos, totalVideos, totalLivestreams, totalRewards, totalCamlyClaimed };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
    icon: LucideIcon;
    label: string;
    value: number;
    color: string;
    bgColor: string;
    showCamlyLogo?: boolean;
    modalType: ModalType;
  }> = [
    {
      icon: Users,
      label: t('totalUsers'),
      value: stats?.totalUsers || 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      modalType: 'members',
    },
    {
      icon: FileText,
      label: t('totalPosts'),
      value: stats?.totalPosts || 0,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      modalType: 'posts',
    },
    {
      icon: Image,
      label: t('totalPhotos'),
      value: stats?.totalPhotos || 0,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      modalType: 'photos',
    },
    {
      icon: Video,
      label: t('totalVideos'),
      value: stats?.totalVideos || 0,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      modalType: 'videos',
    },
    {
      icon: Radio,
      label: t('totalLivestreams'),
      value: stats?.totalLivestreams || 0,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      modalType: 'livestreams',
    },
    {
      icon: BadgeDollarSign,
      label: t('totalRewards'),
      value: stats?.totalRewards || 0,
      color: 'text-gold',
      bgColor: 'bg-gold/10',
      showCamlyLogo: true,
      modalType: 'rewards',
    },
    {
      icon: Coins,
      label: t('totalCamlyClaimed'),
      value: stats?.totalCamlyClaimed || 0,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      showCamlyLogo: true,
      modalType: 'claimed',
    },
  ];

  // Map content stats types to their titles and icons for the modal
  const contentModalConfig: Record<ContentStatsType, { title: string; icon: LucideIcon; showCamlyLogo?: boolean }> = {
    posts: { title: t('totalPosts'), icon: FileText },
    photos: { title: t('totalPhotos'), icon: Image },
    videos: { title: t('totalVideos'), icon: Video },
    livestreams: { title: t('totalLivestreams'), icon: Radio },
    rewards: { title: t('totalRewards'), icon: BadgeDollarSign, showCamlyLogo: true },
  };

  const isContentType = (m: ModalType): m is ContentStatsType =>
    m !== null && m !== 'members' && m !== 'claimed';

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
                fontFamily: "'Playfair Display', Georgia, serif",
                background: 'linear-gradient(90deg, #FF6B9D 0%, #C44FE2 15%, #7B68EE 30%, #00CED1 50%, #98FB98 70%, #FFFF00 85%, #FFB347 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(1px 1px 0px rgba(255,255,255,0.5)) drop-shadow(0 0 8px rgba(255, 182, 193, 0.5))',
              }}
            >
              Honor Board
            </h3>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-2">
          {statItems.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 py-2.5 px-4 rounded-full bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] border-[3px] border-[#D4AF37] transition-all duration-300 hover:scale-[1.02] cursor-pointer ring-2 ring-transparent hover:ring-[#FFD700]/50"
              onClick={() => handleStatClick(item.modalType)}
            >
              <div className="p-1.5 rounded-full bg-white/10 shrink-0">
                <item.icon className="w-4 h-4 text-[#F5E6C8]" />
              </div>
              <div className="flex-1 flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                <span className="text-[#F5E6C8] text-[10px] sm:text-xs uppercase font-semibold truncate flex-shrink min-w-0 underline decoration-dotted underline-offset-2">
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

        {/* Modals */}
        <NewMembersModal open={activeModal === 'members'} onOpenChange={(o) => !o && setActiveModal(null)} />
        <ClaimHistoryModal open={activeModal === 'claimed'} onOpenChange={(o) => !o && setActiveModal(null)} />
        {isContentType(activeModal) && (
          <ContentStatsModal
            open={true}
            onOpenChange={(o) => !o && setActiveModal(null)}
            type={activeModal}
            title={contentModalConfig[activeModal].title}
            icon={contentModalConfig[activeModal].icon}
            showCamlyLogo={contentModalConfig[activeModal].showCamlyLogo}
          />
        )}
      </div>
    </div>
  );
});

AppHonorBoard.displayName = 'AppHonorBoard';
