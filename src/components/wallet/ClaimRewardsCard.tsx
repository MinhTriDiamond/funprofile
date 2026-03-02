import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Gift, Loader2, Rocket, RefreshCw, Calendar, TrendingUp, Users, Lock } from 'lucide-react';
import { useEpochAllocation } from '@/hooks/useEpochAllocation';
import { formatFUN } from '@/config/pplp';
import funLogo from '@/assets/tokens/fun-logo.png';
import { useLanguage } from '@/i18n/LanguageContext';

interface ClaimRewardsCardProps {
  onClaimSuccess?: (requestId: string) => void;
}

const getEpochStatusInfo = (status: string | undefined) => {
  switch (status) {
    case 'snapshot':
      return { label: 'Sẵn sàng claim', color: 'bg-green-500/10 text-green-600 border-green-500/30', emoji: '✅' };
    case 'finalized':
      return { label: 'Đã hoàn tất', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', emoji: '🔒' };
    default:
      return { label: 'Đang tích lũy', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', emoji: '⏳' };
  }
};

const formatMonth = (epochMonth: string) => {
  if (!epochMonth) return '';
  const [y, m] = epochMonth.split('-');
  return `Tháng ${parseInt(m)}/${y}`;
};

export const ClaimRewardsCard = ({ onClaimSuccess }: ClaimRewardsCardProps) => {
  const { currentMonth, latestEpoch, allocation, isLoading, refetch, claim, isClaiming } = useEpochAllocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t } = useLanguage();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleClaim = async () => {
    if (!allocation) return;
    const result = await claim(allocation.id);
    if (result.success && result.requestId && onClaimSuccess) {
      onClaimSuccess(result.requestId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" />
          <p className="text-muted-foreground mt-2">{t('walletLoadingActions')}</p>
        </CardContent>
      </Card>
    );
  }

  const epochStatus = getEpochStatusInfo(latestEpoch?.status);
  const canClaim = allocation && allocation.is_eligible && allocation.status === 'pending' && allocation.allocation_amount_capped > 0;
  const isClaimed = allocation?.status === 'claimed' || allocation?.status === 'minted';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5" />
            FUN Money — Epoch Minting
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        {/* Current Month Accumulation */}
        <div className="border rounded-lg p-4 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm">{formatMonth(currentMonth.epoch_month)} — Đang tích lũy</span>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">⏳ Đang mở</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Light Score tích lũy</div>
              <div className="text-xl font-bold text-amber-600">{formatFUN(currentMonth.total_light_score)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Số actions</div>
              <div className="text-xl font-bold">{currentMonth.actions_count}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Light Score tích lũy trong tháng. Cuối tháng, Admin chụp snapshot và phân bổ FUN theo tỷ lệ đóng góp.
          </p>
        </div>

        {/* Latest Epoch Allocation */}
        {latestEpoch ? (
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-sm">{formatMonth(latestEpoch.epoch_month)} — Kết quả phân bổ</span>
              <Badge variant="outline" className={`${epochStatus.color} text-xs`}>{epochStatus.emoji} {epochStatus.label}</Badge>
            </div>

            {/* Epoch Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="text-xs text-muted-foreground">Mint Pool</div>
                <div className="font-bold text-sm">{formatFUN(latestEpoch.mint_pool)}</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="text-xs text-muted-foreground">Tổng Light</div>
                <div className="font-bold text-sm">{formatFUN(latestEpoch.total_light_score)}</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Users</div>
                <div className="font-bold text-sm">{latestEpoch.eligible_users}</div>
              </div>
            </div>

            {/* User Allocation */}
            {allocation ? (
              <div className="border-t pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Light Score của bạn</div>
                    <div className="text-lg font-bold">{formatFUN(allocation.light_score_total)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Tỷ lệ (%)</div>
                    <div className="text-lg font-bold">{allocation.share_percent.toFixed(2)}%</div>
                  </div>
                </div>

                {!allocation.is_eligible && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-sm text-red-600">
                    ⚠️ Không đủ điều kiện: {allocation.reason_codes.join(', ')}
                  </div>
                )}

                {/* Allocation Amount */}
                <div className="flex items-center justify-between bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-lg p-3">
                  <span className="font-semibold">FUN phân bổ cho bạn:</span>
                  <div className="flex items-center gap-2">
                    <img src={funLogo} alt="FUN" className="w-6 h-6 rounded-full" />
                    <span className="text-2xl font-bold text-amber-600">{formatFUN(allocation.allocation_amount_capped)} FUN</span>
                  </div>
                </div>

                {/* Status & Claim Button */}
                {isClaimed ? (
                  <div className="text-center py-3">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      <Lock className="w-3 h-3 mr-1" /> Đã claim — chờ Admin ký
                    </Badge>
                  </div>
                ) : canClaim ? (
                  <Button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold py-6"
                  >
                    {isClaiming ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('walletProcessing')}</>
                    ) : (
                      <><Rocket className="w-5 h-5 mr-2" />Claim {formatFUN(allocation.allocation_amount_capped)} FUN</>
                    )}
                  </Button>
                ) : (
                  <div className="text-center py-3 text-sm text-muted-foreground">
                    Không có FUN để claim trong epoch này.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Bạn không có allocation trong epoch này.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Gift className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Chưa có epoch nào được snapshot</p>
            <p className="text-sm text-muted-foreground mt-1">Hãy tiếp tục tích lũy Light Score. Admin sẽ chụp snapshot cuối tháng.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          💡 FUN được phân bổ theo tỷ lệ đóng góp Light Score trong epoch (LS-Math-v1.0). Anti-whale cap: 3%.
        </p>
      </CardContent>
    </Card>
  );
};
