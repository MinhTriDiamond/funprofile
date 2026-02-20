import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Gift, Wallet, AlertTriangle, Info, Clock, CheckCircle2, TrendingUp, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { RewardStats } from './RewardBreakdown';
import camlyLogo from '@/assets/tokens/camly-logo.webp';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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
  hasAvatar: boolean;
  hasCover: boolean;
  hasTodayPost: boolean;
  hasFullName: boolean;
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
  hasAvatar,
  hasCover,
  hasTodayPost,
  hasFullName,
  onClaimClick,
  onConnectClick,
}: ClaimRewardsSectionProps) => {
  const navigate = useNavigate();
  const [adminMessage, setAdminMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const totalReward = rewardStats?.total_reward || 0;
  const pendingAmount = Math.max(0, totalReward - claimedAmount - claimableReward);
  const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyClaimed);

  const statusConfig: Record<string, { label: string; color: string; disabled: boolean }> = {
    pending: { label: `Claim ${formatNumber(claimableReward)} CAMLY`, color: 'text-green-600', disabled: false },
    approved: { label: `Claim ${formatNumber(claimableReward)} CAMLY`, color: 'text-green-600', disabled: false },
    on_hold: { label: 'Tạm giữ', color: 'text-orange-600', disabled: true },
    rejected: { label: 'Từ chối', color: 'text-red-600', disabled: true },
  };

  const config = statusConfig[rewardStatus] || statusConfig.pending;

  const allConditionsMet = hasAvatar && hasCover && hasTodayPost && hasFullName && isConnected;

  const handleClaimClick = () => {
    if (!isConnected) {
      onConnectClick();
      return;
    }
    if (config.disabled) {
      if (rewardStatus === 'on_hold') toast.warning('Tài khoản đang bị tạm giữ, vui lòng liên hệ admin');
      else if (rewardStatus === 'rejected') toast.error('Phần thưởng đã bị từ chối, vui lòng liên hệ admin');
      return;
    }
    if (!allConditionsMet) {
      const missing: string[] = [];
      if (!hasFullName) missing.push('• Cập nhật họ tên đầy đủ (tối thiểu 4 ký tự)');
      if (!hasAvatar) missing.push('• Thêm ảnh đại diện (hình người thật)');
      if (!hasCover) missing.push('• Thêm ảnh bìa trang cá nhân');
      if (!hasTodayPost) missing.push('• Đăng ít nhất 1 bài hôm nay');
      if (!isConnected) missing.push('• Kết nối ví');
      toast.warning('Chưa đủ điều kiện claim', {
        description: missing.join('\n'),
        duration: 6000,
      });
      return;
    }
    onClaimClick();
  };

  const ADMIN_ID = '70640edc-337f-4e89-bd7e-9501bd79ec9f';

  const handleSendToAdmin = async () => {
    if (!adminMessage.trim()) {
      toast.warning('Vui lòng nhập nội dung tin nhắn');
      return;
    }
    setIsSendingMessage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Vui lòng đăng nhập');
        return;
      }
      const userId = session.user.id;
      const messageContent = `[Hỗ trợ Claim Rewards] ${adminMessage.trim()}`;

      // Find existing conversation with admin
      const { data: existingConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)
        .is('left_at', null);

      let conversationId: string | null = null;

      if (existingConvs && existingConvs.length > 0) {
        const convIds = existingConvs.map(c => c.conversation_id);
        const { data: adminConv } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', ADMIN_ID)
          .in('conversation_id', convIds)
          .is('left_at', null)
          .limit(1)
          .single();
        
        if (adminConv) conversationId = adminConv.conversation_id;
      }

      // Create new conversation if none exists
      if (!conversationId) {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({ type: 'direct', created_by: userId })
          .select('id')
          .single();
        if (convErr || !newConv) throw convErr;
        conversationId = newConv.id;

        // Add both participants
        await supabase.from('conversation_participants').insert([
          { conversation_id: conversationId, user_id: userId, role: 'member' },
          { conversation_id: conversationId, user_id: ADMIN_ID, role: 'admin' },
        ]);
      }

      // Send the message
      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: messageContent,
      });
      if (msgErr) throw msgErr;

      // Create notification for admin
      await supabase.from('notifications').insert({
        user_id: ADMIN_ID,
        actor_id: userId,
        type: 'comment', // reuse existing type for bell notification
      });

      toast.success('Đã gửi tin nhắn đến Admin!', {
        description: 'Admin sẽ phản hồi sớm nhất có thể',
      });
      setAdminMessage('');
    } catch (err) {
      console.error('Error sending admin message:', err);
      toast.error('Gửi tin nhắn thất bại, vui lòng thử lại');
    } finally {
      setIsSendingMessage(false);
    }
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

        {/* On Hold Alert */}
        {rewardStatus === 'on_hold' && adminNotes && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Tài khoản đang chờ xác minh 🙏</p>
                <p className="text-xs text-amber-700 mt-1">{adminNotes}</p>
                <p className="text-xs text-amber-600 mt-2">
                  Hệ thống cần xác minh để bảo vệ quyền lợi cho tất cả mọi người. Vui lòng liên hệ Admin qua tin nhắn để được hỗ trợ nhanh nhất. Cảm ơn bạn đã thấu hiểu 💛
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message Admin Section - shown when user can't claim */}
        {(rewardStatus === 'on_hold' || rewardStatus === 'rejected') && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Nhắn tin với Admin</p>
            </div>
            <Textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Nhập nội dung cần hỗ trợ... (VD: Tài khoản em bị giữ, admin xem giúp em ạ)"
              className="min-h-[80px] text-sm resize-none bg-white dark:bg-background"
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{adminMessage.length}/500</span>
              <Button
                onClick={handleSendToAdmin}
                disabled={isSendingMessage || !adminMessage.trim()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSendingMessage ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Đang gửi...</>
                ) : (
                  <><Send className="w-4 h-4 mr-1.5" />Gửi tin nhắn</>
                )}
              </Button>
            </div>
          </div>
        )}

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

        {/* Profile Completion Reminders */}
        {!allConditionsMet && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 space-y-2">
            <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Cập nhật hồ sơ để rút tiền
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className={hasFullName ? 'text-green-600' : 'text-red-500'}>{hasFullName ? '✅' : '❌'}</span>
                <span className={hasFullName ? 'text-green-700' : 'text-orange-700'}>
                  Họ tên đầy đủ (tối thiểu 4 ký tự)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={hasAvatar ? 'text-green-600' : 'text-red-500'}>{hasAvatar ? '✅' : '❌'}</span>
                <span className={hasAvatar ? 'text-green-700' : 'text-orange-700'}>
                  Ảnh đại diện (hình người thật)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={hasCover ? 'text-green-600' : 'text-red-500'}>{hasCover ? '✅' : '❌'}</span>
                <span className={hasCover ? 'text-green-700' : 'text-orange-700'}>
                  Ảnh bìa trang cá nhân
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={hasTodayPost ? 'text-green-600' : 'text-red-500'}>{hasTodayPost ? '✅' : '❌'}</span>
                <span className={hasTodayPost ? 'text-green-700' : 'text-orange-700'}>
                  Đăng ít nhất 1 bài hôm nay
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={isConnected ? 'text-green-600' : 'text-red-500'}>{isConnected ? '✅' : '❌'}</span>
                <span className={isConnected ? 'text-green-700' : 'text-orange-700'}>
                  Kết nối ví
                </span>
              </div>
            </div>
            {!hasFullName || !hasAvatar || !hasCover ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => navigate('/profile')}
              >
                Cập nhật trang cá nhân
              </Button>
            ) : null}
          </div>
        )}

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
        </div>
      </CardContent>
    </Card>
  );
};
