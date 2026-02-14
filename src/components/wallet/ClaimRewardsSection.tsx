import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Gift, Wallet, AlertTriangle, Info, Heart, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { RewardStats } from './RewardBreakdown';
import camlyLogo from '@/assets/tokens/camly-logo.webp';

const MINIMUM_THRESHOLD = 200000;
const DAILY_LIMIT = 500000;

interface ClaimRewardsSectionProps {
  claimableReward: number;
  claimedAmount: number;
  dailyClaimed: number;
  rewardStats: RewardStats | null;
  camlyPrice: number;
  isConnected: boolean;
  rewardStatus: string;
  adminNotes?: string | null;
  isLoading: boolean;
  onClaimClick: () => void;
  onConnectClick: () => void;
}

const formatNumber = (num: number) => {
  return num.toLocaleString('vi-VN');
};

export const ClaimRewardsSection = ({
  claimableReward,
  claimedAmount,
  dailyClaimed,
  rewardStats,
  camlyPrice,
  isConnected,
  rewardStatus,
  adminNotes,
  isLoading,
  onClaimClick,
  onConnectClick,
}: ClaimRewardsSectionProps) => {
  const totalReward = rewardStats?.total_reward || 0;
  const pendingAmount = Math.max(0, totalReward - claimedAmount - claimableReward);
  const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyClaimed);

  const statusConfig: Record<string, { label: string; color: string; disabled: boolean }> = {
    pending: { label: 'Chờ duyệt', color: 'text-yellow-600', disabled: true },
    approved: { label: 'Đã duyệt', color: 'text-green-600', disabled: false },
    on_hold: { label: 'Tạm giữ', color: 'text-orange-600', disabled: true },
    rejected: { label: 'Từ chối', color: 'text-red-600', disabled: true },
  };

  const config = statusConfig[rewardStatus] || statusConfig.pending;

  const handleClaimClick = () => {
    if (!isConnected) {
      onConnectClick();
      return;
    }
    if (config.disabled) {
      if (rewardStatus === 'pending') toast.info('Phần thưởng đang chờ admin duyệt');
      else if (rewardStatus === 'on_hold') toast.warning('Tài khoản đang bị tạm giữ, vui lòng liên hệ admin');
      else if (rewardStatus === 'rejected') toast.error('Phần thưởng đã bị từ chối, vui lòng liên hệ admin');
      return;
    }
    onClaimClick();
  };

  const minThresholdProgress = Math.min(100, (claimableReward / MINIMUM_THRESHOLD) * 100);
  const dailyProgress = Math.min(100, (dailyClaimed / DAILY_LIMIT) * 100);

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-400 text-white pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">Claim Rewards</CardTitle>
            <CardDescription className="text-white/80 text-xs">
              Nhận thưởng CAMLY từ hoạt động trên FUN PROFILE
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Valentine Banner */}
        <div className="bg-gradient-to-r from-pink-500/10 via-red-500/10 to-pink-500/10 border border-pink-200 rounded-xl p-3 flex items-center gap-3">
          <Heart className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
          <p className="text-sm text-red-700 font-medium">
            🌹 Happy Valentine's Day — Claim phần thưởng yêu thương từ FUN.RICH! 💕
          </p>
        </div>

        {/* 2x2 Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Có thể Claim */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700 font-medium">Có thể Claim</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img src={camlyLogo} alt="CAMLY" className="w-5 h-5 rounded-full" />
              <span className="text-lg font-bold text-green-800">{formatNumber(claimableReward)}</span>
            </div>
            <p className="text-xs text-green-600 mt-0.5">~${(claimableReward * camlyPrice).toFixed(2)}</p>
          </div>

          {/* Chờ duyệt */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-yellow-700 font-medium">Chờ duyệt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img src={camlyLogo} alt="CAMLY" className="w-5 h-5 rounded-full" />
              <span className="text-lg font-bold text-yellow-800">{formatNumber(pendingAmount)}</span>
            </div>
            <p className="text-xs text-yellow-600 mt-0.5">~${(pendingAmount * camlyPrice).toFixed(2)}</p>
          </div>

          {/* Đã Claim */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">Đã Claim</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img src={camlyLogo} alt="CAMLY" className="w-5 h-5 rounded-full" />
              <span className="text-lg font-bold text-blue-800">{formatNumber(claimedAmount)}</span>
            </div>
            <p className="text-xs text-blue-600 mt-0.5">~${(claimedAmount * camlyPrice).toFixed(2)}</p>
          </div>

          {/* Tổng đã nhận */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-700 font-medium">Tổng đã nhận</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img src={camlyLogo} alt="CAMLY" className="w-5 h-5 rounded-full" />
              <span className="text-lg font-bold text-purple-800">{formatNumber(totalReward)}</span>
            </div>
            <p className="text-xs text-purple-600 mt-0.5">~${(totalReward * camlyPrice).toFixed(2)}</p>
          </div>
        </div>

        {/* Claim Button */}
        <div>
          {!isConnected ? (
            <Button
              onClick={onConnectClick}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white font-bold py-6 text-base rounded-xl shadow-lg"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Kết nối ví để Claim
            </Button>
          ) : (
            <Button
              onClick={handleClaimClick}
              disabled={config.disabled || claimableReward <= 0}
              className={`w-full py-6 text-base rounded-xl font-bold shadow-lg transition-all ${
                config.disabled || claimableReward <= 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white hover:shadow-xl hover:scale-[1.01]'
              }`}
            >
              {config.disabled ? (
                <span className="flex items-center gap-2">
                  {rewardStatus === 'on_hold' && <AlertTriangle className="w-5 h-5" />}
                  {config.label}
                  {(rewardStatus === 'on_hold' || rewardStatus === 'rejected') && adminNotes && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-sm">{adminNotes}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Claim {formatNumber(claimableReward)} CAMLY
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Progress Bars */}
        <div className="space-y-3">
          {/* Minimum Threshold */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">Ngưỡng tối thiểu</span>
              <span className="text-xs font-semibold text-gray-700">
                {formatNumber(Math.min(claimableReward, MINIMUM_THRESHOLD))} / {formatNumber(MINIMUM_THRESHOLD)} CAMLY
              </span>
            </div>
            <Progress value={minThresholdProgress} className="h-2.5 bg-gray-100" />
            {claimableReward < MINIMUM_THRESHOLD && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Cần tối thiểu {formatNumber(MINIMUM_THRESHOLD)} CAMLY để claim
              </p>
            )}
          </div>

          {/* Daily Limit */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">Giới hạn hàng ngày</span>
              <span className="text-xs font-semibold text-gray-700">
                {formatNumber(dailyClaimed)} / {formatNumber(DAILY_LIMIT)} CAMLY
              </span>
            </div>
            <Progress value={dailyProgress} className="h-2.5 bg-gray-100" />
            {dailyRemaining <= 0 && (
              <p className="text-xs text-red-600 mt-1">
                ❌ Đã hết giới hạn claim hôm nay, vui lòng quay lại ngày mai
              </p>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="shrink-0">📌</span>
            <span>Ngưỡng tối thiểu: {formatNumber(MINIMUM_THRESHOLD)} CAMLY mỗi lần claim</span>
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="shrink-0">✅</span>
            <span>Admin duyệt trước khi cho phép claim</span>
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="shrink-0">⏰</span>
            <span>Giới hạn: {formatNumber(DAILY_LIMIT)} CAMLY / ngày. Phần dư sẽ được cộng dồn ngày tiếp theo</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
