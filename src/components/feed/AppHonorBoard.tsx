import { memo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Users, Video, BadgeDollarSign, Coins, Gift, HandHeart, LucideIcon } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { useTokenPrices, FALLBACK_PRICES } from '@/hooks/useTokenPrices';

import camlyLogo from '@/assets/tokens/camly-logo.webp';
import { ClaimHistoryModal } from './ClaimHistoryModal';
import { NewMembersModal } from './NewMembersModal';
import { ContentStatsModal, ContentStatsType } from './ContentStatsModal';
import { GlobalGiftStatsModal, GlobalGiftDirection } from './GlobalGiftStatsModal';

interface AppStats {
  totalUsers: number;
  totalRewards: number;
  totalCamlyClaimed: number;
  totalVideosCombined: number;
  totalSentUsd: number;
  totalReceivedUsd: number;
}

type ModalType = 'members' | 'claimed' | 'videos' | 'gifts_sent' | 'gifts_received' | null;

function formatCompactUsd(n: number): string {
  if (!n || !isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export const AppHonorBoard = memo(() => {
  const { t } = useLanguage();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['app-honor-board-stats'],
    queryFn: async (): Promise<AppStats> => {
      const { data, error } = await supabase.rpc('get_app_stats');
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null ?? {};
      return {
        totalUsers: Number(row.total_users) || 0,
        totalRewards: Number(row.total_rewards) || 0,
        totalCamlyClaimed: Number(row.total_camly_claimed) || 0,
        totalVideosCombined: Number(row.total_videos_combined) || 0,
        totalSentUsd: Number(row.total_sent_usd) || 0,
        totalReceivedUsd: Number(row.total_received_usd) || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="fb-card p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  type StatItem = {
    icon: LucideIcon;
    label: string;
    displayValue: string;
    showCamlyLogo?: boolean;
    modalType: ModalType;
  };

  const statItems: StatItem[] = [
    {
      icon: Users,
      label: t('totalUsers'),
      displayValue: formatNumber(stats?.totalUsers || 0),
      modalType: 'members',
    },
    {
      icon: Video,
      label: t('totalVideosCombined'),
      displayValue: formatNumber(stats?.totalVideosCombined || 0),
      modalType: 'videos',
    },
    {
      icon: Gift,
      label: t('globalTotalSent'),
      displayValue: formatCompactUsd(stats?.totalSentUsd || 0),
      modalType: 'gifts_sent',
    },
    {
      icon: HandHeart,
      label: t('globalTotalReceived'),
      displayValue: formatCompactUsd(stats?.totalReceivedUsd || 0),
      modalType: 'gifts_received',
    },
    {
      icon: BadgeDollarSign,
      label: t('totalRewards'),
      displayValue: formatNumber(stats?.totalRewards || 0),
      showCamlyLogo: true,
      modalType: null,
    },
    {
      icon: Coins,
      label: t('totalCamlyClaimed'),
      displayValue: formatNumber(stats?.totalCamlyClaimed || 0),
      showCamlyLogo: true,
      modalType: 'claimed',
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
                fontFamily: "'Playfair Display', Georgia, serif",
                background: 'linear-gradient(90deg, #FF3B3B 0%, #FF7A1A 15%, #FFC700 30%, #8BD600 45%, #00C853 58%, #00BCD4 72%, #2979FF 85%, #8E24AA 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.4))',
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
              onClick={() => item.modalType && setActiveModal(item.modalType)}
            >
              <div className="p-1.5 rounded-full bg-white/10 shrink-0">
                <item.icon className="w-4 h-4 text-[#F5E6C8]" />
              </div>
              <div className="flex-1 flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                <span className="text-[#F5E6C8] text-[10px] sm:text-xs uppercase font-semibold truncate flex-shrink min-w-0 underline decoration-dotted underline-offset-2">
                  {item.label}
                </span>
                <span className="text-[#FFD700] font-bold text-[11px] sm:text-sm flex items-center gap-1 flex-shrink-0">
                  <span className="tabular-nums">{item.displayValue}</span>
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
        {activeModal === 'videos' && (
          <ContentStatsModal
            open={true}
            onOpenChange={(o) => !o && setActiveModal(null)}
            type={'posts' as ContentStatsType}
            title={t('totalVideosCombined')}
            icon={Video}
          />
        )}
        {(activeModal === 'gifts_sent' || activeModal === 'gifts_received') && (
          <GlobalGiftStatsModal
            open={true}
            onOpenChange={(o) => !o && setActiveModal(null)}
            direction={(activeModal === 'gifts_sent' ? 'sent' : 'received') as GlobalGiftDirection}
            totalUsd={activeModal === 'gifts_sent' ? (stats?.totalSentUsd || 0) : (stats?.totalReceivedUsd || 0)}
          />
        )}
      </div>
    </div>
  );
});

AppHonorBoard.displayName = 'AppHonorBoard';
