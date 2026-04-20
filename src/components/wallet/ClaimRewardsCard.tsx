import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Gift, Loader2, Rocket, RefreshCw, Calendar, TrendingUp, Users, Lock } from 'lucide-react';
import { useEpochAllocation, EpochWithAllocation } from '@/hooks/useEpochAllocation';
import { formatFUN } from '@/config/pplp';
import funLogo from '@/assets/tokens/fun-logo.png';
import { useLanguage } from '@/i18n/LanguageContext';

interface ClaimRewardsCardProps {
  onClaimSuccess?: (requestId: string) => void;
}

const getEpochStatusInfo = (status: string | undefined) => {
  switch (status) {
    case 'snapshot':
      return { label: 'Sẵn sàng claim', color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800', emoji: '✅' };
    case 'finalized':
      return { label: 'Đã hoàn tất', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800', emoji: '🔒' };
    default:
      return { label: 'Đang tích lũy', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800', emoji: '⏳' };
  }
};

const formatMonth = (epochMonth: string) => {
  if (!epochMonth) return '';
  const [y, m] = epochMonth.split('-');
  return `T${parseInt(m)}/${y}`;
};

const EpochBlock = ({ epochData, onClaim, isClaiming }: { epochData: EpochWithAllocation; onClaim: (id: string) => void; isClaiming: boolean }) => {
  const { epoch, allocation } = epochData;
  const { t } = useLanguage();
  const epochStatus = getEpochStatusInfo(epoch.status);
  const canClaim = allocation && allocation.is_eligible && allocation.status === 'pending' && allocation.allocation_amount_capped > 0;
  const isClaimed = allocation?.status === 'claimed' || allocation?.status === 'minted';

  return (
    <div className="rounded-lg border border-border p-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-sm text-foreground">{formatMonth(epoch.epoch_month)}</span>
        <Badge variant="outline" className={`${epochStatus.color} text-[10px]`}>
          {epochStatus.emoji} {epochStatus.label}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-md bg-muted/40">
          <div className="font-bold text-sm text-foreground">{formatFUN(epoch.mint_pool)}</div>
          <div className="text-[10px] text-muted-foreground">Pool</div>
        </div>
        <div className="text-center p-2 rounded-md bg-muted/40">
          <div className="font-bold text-sm text-foreground">{formatFUN(epoch.total_light_score)}</div>
          <div className="text-[10px] text-muted-foreground">Total Light</div>
        </div>
        <div className="text-center p-2 rounded-md bg-muted/40">
          <div className="font-bold text-sm text-foreground flex items-center justify-center gap-1">
            <Users className="w-3 h-3" />{epoch.eligible_users}
          </div>
          <div className="text-[10px] text-muted-foreground">Users</div>
        </div>
      </div>

      {allocation ? (
        <div className="border-t border-border pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground">Light Score của bạn</div>
              <div className="text-lg font-bold text-foreground">{formatFUN(allocation.light_score_total)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Tỷ lệ</div>
              <div className="text-lg font-bold text-foreground">{allocation.share_percent.toFixed(2)}%</div>
            </div>
          </div>

          {!allocation.is_eligible && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2.5 text-sm text-destructive">
              ⚠️ Không đủ điều kiện: {allocation.reason_codes.join(', ')}
            </div>
          )}

          <div className="flex items-center justify-between bg-primary/5 rounded-lg p-3 border border-primary/10">
            <span className="font-semibold text-sm text-foreground">FUN phân bổ:</span>
            <div className="flex items-center gap-2">
              <img src={funLogo} alt="FUN" className="w-5 h-5 rounded-full" />
              <span className="text-xl font-bold text-amber-600">{formatFUN(allocation.allocation_amount_capped)} FUN</span>
            </div>
          </div>

          {isClaimed ? (
            <div className="text-center py-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                <Lock className="w-3 h-3 mr-1" /> Đã claim — chờ Admin ký
              </Badge>
            </div>
          ) : canClaim ? (
            <Button
              onClick={() => onClaim(allocation.id)}
              disabled={isClaiming}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-5"
            >
              {isClaiming ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('walletProcessing')}</>
              ) : (
                <><Rocket className="w-4 h-4 mr-2" />Claim {formatFUN(allocation.allocation_amount_capped)} FUN</>
              )}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-center py-2 text-sm text-muted-foreground">Không có allocation trong epoch này.</p>
      )}
    </div>
  );
};

export const ClaimRewardsCard = ({ onClaimSuccess }: ClaimRewardsCardProps) => {
  const { currentMonth, allEpochs, isLoading, refetch, claim, isClaiming } = useEpochAllocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t } = useLanguage();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleClaim = async (allocationId: string) => {
    const result = await claim(allocationId);
    if (result.success && result.requestId && onClaimSuccess) {
      onClaimSuccess(result.requestId);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-md border-border">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground mt-2 text-sm">{t('walletLoadingActions')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-border overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            Epoch Minting
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Current Month */}
        <div className="rounded-lg border border-border p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-foreground">{formatMonth(currentMonth.epoch_month)}</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-[10px]">
              ⏳ Đang tích lũy
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-muted/40 p-2.5 text-center">
              <div className="text-lg font-bold text-foreground">{formatFUN(currentMonth.total_light_score)}</div>
              <div className="text-[10px] text-muted-foreground">Light Score</div>
            </div>
            <div className="rounded-md bg-muted/40 p-2.5 text-center">
              <div className="text-lg font-bold text-foreground">{currentMonth.actions_count}</div>
              <div className="text-[10px] text-muted-foreground">Actions</div>
            </div>
          </div>
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-2.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            🌙 Chu kỳ tháng này đang diễn ra — phân bổ FUN sẽ chính thức mở vào <strong>ngày 01 tháng sau</strong> nhé bạn! Mọi Light Score bạn tích lũy đến cuối tháng đều được tính đầy đủ. 💛
          </div>
        </div>

        {/* All Epochs */}
        {allEpochs.length > 0 ? (
          allEpochs.map((epochData) => (
            <EpochBlock key={epochData.epoch.id} epochData={epochData} onClaim={handleClaim} isClaiming={isClaiming} />
          ))
        ) : (
          <div className="text-center py-8">
            <Gift className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Chưa có epoch nào được snapshot</p>
            <p className="text-xs text-muted-foreground mt-1">Tiếp tục tích lũy Light Score.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
