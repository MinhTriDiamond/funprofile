import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLightScore } from '@/hooks/useLightScore';
import { usePendingActions } from '@/hooks/usePendingActions';
import { useFunBalance } from '@/hooks/useFunBalance';
import { useMintHistory } from '@/hooks/useMintHistory';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles, Coins, Lock, Zap, RefreshCw, Wallet, AlertTriangle,
  Loader2, FileText, Heart, MessageCircle, Users, Send, Gift,
  ChevronDown, ChevronUp, Rocket, ExternalLink, ArrowRight, CheckCircle2, Clock, XCircle,
  History
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatFUN, getAddressUrl, FUN_MONEY_CONTRACT } from '@/config/pplp';
import funLogo from '@/assets/tokens/fun-logo.png';
import { useLanguage } from '@/i18n/LanguageContext';

const PILLAR_ICONS = {
  service: '☀️',
  truth: '🔍',
  healing: '💚',
  value: '🌱',
  unity: '🤝',
};

const PILLAR_NAMES = {
  service: 'Phụng sự sự sống',
  truth: 'Chân thật minh bạch',
  healing: 'Chữa lành & yêu thương',
  value: 'Đóng góp bền vững',
  unity: 'Hợp Nhất',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  post: <FileText className="w-4 h-4 text-blue-500" />,
  reaction: <Heart className="w-4 h-4 text-pink-500" />,
  comment: <MessageCircle className="w-4 h-4 text-green-500" />,
  share: <Send className="w-4 h-4 text-purple-500" />,
  friend: <Users className="w-4 h-4 text-cyan-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  post: 'Tạo bài viết',
  comment: 'Bình luận',
  reaction: 'Cảm xúc',
  share: 'Chia sẻ',
  friend: 'Kết bạn',
  livestream: 'Phát trực tiếp',
  new_user_bonus: 'Thưởng người mới',
};

// Helper: status config cho mint request
const getMintStatusConfig = (status: string) => {
  switch (status) {
    case 'pending_sig':
      return { label: 'Chờ Admin ký', icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />, badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' };
    case 'signing':
      return { label: 'Đang ký (chưa đủ 3/3)', icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />, badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' };
    case 'signed':
      return { label: 'Đã ký, chờ Submit', icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />, badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' };
    case 'submitted':
      return { label: 'Đã gửi blockchain', icon: <Rocket className="w-3.5 h-3.5 text-cyan-500" />, badgeClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' };
    case 'confirmed':
      return { label: 'Đã xác nhận ✓', icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />, badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
    case 'failed':
      return { label: 'Thất bại', icon: <XCircle className="w-3.5 h-3.5 text-red-500" />, badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
    default:
      return { label: status, icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />, badgeClass: '' };
  }
};

interface MintRequestRowProps {
  req: { id: string; amount_display: number; status: string; created_at: string; updated_at: string; action_types: string[] | null };
}
const MintRequestRow = ({ req }: MintRequestRowProps) => {
  const { label, icon, badgeClass } = getMintStatusConfig(req.status);
  return (
    <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-600">{formatFUN(req.amount_display)} FUN</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: vi })}
            {req.action_types && req.action_types.length > 0 && (
              <span className="ml-1">· {req.action_types.join(', ')}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Cập nhật: {formatDistanceToNow(new Date(req.updated_at), { addSuffix: true, locale: vi })}
          </p>
        </div>
      </div>
      <Badge className={`${badgeClass} border-0 text-xs flex-shrink-0`}>{label}</Badge>
    </div>
  );
};

interface LightScoreDashboardProps {
  walletAddress?: `0x${string}`;
  onActivate?: () => void;
  onClaim?: () => void;
}

export const LightScoreDashboard = ({ walletAddress, onActivate, onClaim }: LightScoreDashboardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isLoading, error, refetch, getTierInfo, getNextTierProgress } = useLightScore();
  const { actions, groupedByType, totalAmount, isLoading: isPendingLoading, refetch: refetchPending, claim, isClaiming } = usePendingActions();
  const { total, locked, activated, isLoading: isBalanceLoading, refetch: refetchBalance } = useFunBalance(walletAddress);

  const { activeRequests, historyRequests, hasPendingRequests, todayRequestCount, isLoading: isMintHistoryLoading, refetch: refetchMintHistory } = useMintHistory();
  const MIN_MINT_AMOUNT = 200;
  const MAX_DAILY_REQUESTS = 2;
  const isBelowMinAmount = totalAmount > 0 && totalAmount < MIN_MINT_AMOUNT;
  const isDailyLimitReached = todayRequestCount >= MAX_DAILY_REQUESTS;
  const mintProgress = Math.min(100, (totalAmount / MIN_MINT_AMOUNT) * 100);

  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  // showHistory removed — recent actions section replaced by useMintHistory
  const [showMintHistory, setShowMintHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkWallet = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setHasWallet(false); return; }
      const { data: profile } = await supabase
        .from('profiles').select('public_wallet_address').eq('id', user.id).single();
      setHasWallet(!!profile?.public_wallet_address);
    };
    checkWallet();
  }, []);

  const handleClaimAll = async () => {
    if (actions.length === 0) return;
    const result = await claim(actions.map(a => a.id));
    if (result.success) { refetch(); refetchBalance(); refetchMintHistory(); refetchPending(); }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchPending(), refetchBalance(), refetchMintHistory()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const activatedPercent = total > 0 ? (activated / total) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="border-0 shadow-lg">
          <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">Không thể tải Light Score</p>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const tierInfo = getTierInfo();
  const { progress, nextTier, remaining } = getNextTierProgress();

  return (
    <div className="space-y-4">

      {/* ===== CARD 1: LIGHT SCORE ===== */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-6 h-6 text-amber-500" />
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                LIGHT SCORE
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {tierInfo.emoji} {tierInfo.name}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefreshAll} disabled={isRefreshing}>
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Score Display */}
          <div className="text-center py-2">
            <p className="text-5xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              {data.total_light_score.toLocaleString()}
            </p>
            {data.tier < 3 && (
              <p className="text-sm text-muted-foreground mt-1">
                Còn {remaining.toLocaleString()} điểm để đạt {nextTier.emoji} {nextTier.name}
              </p>
            )}
          </div>

          {/* Progress to next tier */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{tierInfo.emoji} {tierInfo.name}</span>
              <span>{nextTier.emoji} {nextTier.name}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* 5 Pillars */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">5 Pillars of Light</h4>
            <div className="grid gap-1.5">
              {Object.entries(data.pillars).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-base">{PILLAR_ICONS[key as keyof typeof PILLAR_ICONS]}</span>
                  <span className="flex-1 text-xs">{PILLAR_NAMES[key as keyof typeof PILLAR_NAMES]}</span>
                  <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (value / 100) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(value)}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== CARD 2: PENDING FUN MONEY ===== */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5" />
              ⚡ FUN Money Chờ Mint
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-white/90 font-bold">{formatFUN(totalAmount)} FUN</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Daily cap */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hạn mức hôm nay</span>
              <span className="font-medium">{data.today_minted}/{data.daily_cap} FUN</span>
            </div>
            <Progress value={(data.today_minted / data.daily_cap) * 100} className="h-2" />
          </div>

          {/* Wallet warning */}
          {hasWallet === false && totalAmount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Thiết lập ví để nhận FUN</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Cần kết nối ví Web3 để mint {totalAmount} FUN đang chờ.</p>
                </div>
              </div>
              <Button onClick={() => navigate('/wallet')} size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                <Wallet className="w-3.5 h-3.5 mr-2" />Thiết lập ví ngay
              </Button>
            </div>
          )}

          {/* Grouped actions */}
          {isPendingLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-6">
              <Gift className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Không có actions nào đang chờ</p>
              <p className="text-xs text-muted-foreground mt-1">Hãy tạo bài viết, bình luận để kiếm FUN! 🌟</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[250px]">
              <div className="space-y-1.5">
                {groupedByType.map((group) => (
                  <div key={group.action_type} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-2.5 hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedType(expandedType === group.action_type ? null : group.action_type)}
                    >
                      <div className="flex items-center gap-2">
                        {ACTION_ICONS[group.action_type] || <Sparkles className="w-4 h-4 text-amber-500" />}
                        <span className="text-sm font-medium">{ACTION_LABELS[group.action_type] || group.action_type}</span>
                        <Badge variant="secondary" className="text-xs px-1.5">{group.count}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-amber-600">+{formatFUN(group.total_amount)}</span>
                        {expandedType === group.action_type
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </button>
                    {expandedType === group.action_type && (
                      <div className="border-t bg-muted/30 px-3 py-2 space-y-1">
                        {group.items.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-muted-foreground truncate max-w-[200px]">{item.content_preview || 'Light Action'}</span>
                            <span className="text-amber-600 font-medium">+{formatFUN(item.mint_amount)}</span>
                          </div>
                        ))}
                        {group.items.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">+{group.items.length - 5} actions khác</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* ===== MINT BUTTON ===== */}
          {isDailyLimitReached && totalAmount > 0 ? (
            /* Đã đạt giới hạn 2 lần/ngày */
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Đã đạt giới hạn {MAX_DAILY_REQUESTS} lần mint hôm nay
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                  Quay lại vào ngày mai để tiếp tục mint FUN.
                </p>
              </div>
            </div>
          ) : isBelowMinAmount ? (
            /* Chưa đủ MIN_MINT_AMOUNT FUN tối thiểu */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tiến độ đến ngưỡng mint</span>
                <div className="flex items-center gap-1.5">
                  <img src={funLogo} alt="FUN" className="w-4 h-4 rounded-full" />
                  <span className="font-bold text-amber-600">{formatFUN(totalAmount)}/{formatFUN(MIN_MINT_AMOUNT)} FUN</span>
                </div>
              </div>
              <Progress value={mintProgress} className="h-2.5" />
              <p className="text-xs text-muted-foreground text-center">
                💡 Cần thêm <span className="font-semibold text-amber-600">{formatFUN(MIN_MINT_AMOUNT - totalAmount)} FUN</span> để đủ điều kiện mint
              </p>
            </div>
          ) : hasPendingRequests && totalAmount === 0 ? (
            /* Có pending nhưng KHÔNG có action mới → chỉ thông báo, không block */
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-3 flex items-start gap-2">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
                  Đang có {activeRequests.length} yêu cầu đang xử lý
                </p>
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                  Chờ Admin ký duyệt. Khi có actions mới, bạn vẫn có thể mint tiếp.
                </p>
              </div>
            </div>
          ) : totalAmount >= MIN_MINT_AMOUNT ? (
            /* Đủ điều kiện mint */
            <div className="space-y-2">
              {/* Info banner nếu đang có pending request nhưng vẫn có action mới */}
              {hasPendingRequests && (
                <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-2.5 flex items-start gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-700 dark:text-violet-300">
                    Đang có {activeRequests.length} yêu cầu xử lý. Actions mới bên dưới có thể mint độc lập.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Actions mới sẵn sàng:</span>
                <div className="flex items-center gap-1.5">
                  <img src={funLogo} alt="FUN" className="w-5 h-5 rounded-full" />
                  <span className="text-xl font-bold text-amber-600">{formatFUN(totalAmount)} FUN</span>
                </div>
              </div>
              {/* Daily request counter */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Lượt mint hôm nay:</span>
                <span className={todayRequestCount >= MAX_DAILY_REQUESTS - 1 ? 'text-orange-500 font-semibold' : ''}>
                  {todayRequestCount}/{MAX_DAILY_REQUESTS} lần
                </span>
              </div>
              <Button
                onClick={handleClaimAll}
                disabled={isClaiming || data.today_minted >= data.daily_cap || hasWallet === false || hasWallet === null || isDailyLimitReached}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold py-5"
              >
                {isClaiming ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Đang xử lý...</>
                ) : hasWallet === null ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Đang kiểm tra ví...</>
                ) : (
                  <><Rocket className="w-5 h-5 mr-2" />Mint {formatFUN(totalAmount)} FUN</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">💡 Sau khi mint, FUN sẽ chuyển về ví on-chain dưới dạng Locked.</p>
            </div>
          ) : null}

          {/* ===== MINT HISTORY — Đang xử lý + Lịch sử ===== */}
          {!isMintHistoryLoading && (activeRequests.length > 0 || historyRequests.length > 0) && (
            <div className="border-t pt-3 space-y-3">
              {/* Active requests */}
              {activeRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />Đang xử lý ({activeRequests.length})
                  </h4>
                  <div className="space-y-1.5">
                    {activeRequests.map((req) => (
                      <MintRequestRow key={req.id} req={req} />
                    ))}
                  </div>
                </div>
              )}

              {/* History (collapsible) */}
              {historyRequests.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                    onClick={() => setShowMintHistory(!showMintHistory)}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Lịch sử mint ({historyRequests.length} yêu cầu)</span>
                    {showMintHistory ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                  {showMintHistory && (
                    <div className="mt-2 space-y-1.5">
                      {historyRequests.map((req) => (
                        <MintRequestRow key={req.id} req={req} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== CARD 3: FUN ON-CHAIN BALANCE ===== */}
      {walletAddress ? (
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <img src={funLogo} alt="FUN" className="w-5 h-5 rounded-full" />
                💰 Số dư On-chain
              </CardTitle>
              <div className="flex items-center gap-2">
                <a href={getAddressUrl(walletAddress)} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {isBalanceLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : (
              <>
                {/* 3 ô số dư */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-800">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Locked</span>
                    </div>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatFUN(locked)}</p>
                    <p className="text-xs text-muted-foreground">FUN</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 text-center border border-green-100 dark:border-green-800">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">Activated</span>
                    </div>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatFUN(activated)}</p>
                    <p className="text-xs text-muted-foreground">FUN</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 rounded-xl p-3 text-center border border-amber-200 dark:border-amber-700">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Coins className="w-3.5 h-3.5 text-amber-700" />
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-200">Total</span>
                    </div>
                    <p className="text-lg font-bold text-amber-800 dark:text-amber-200">{formatFUN(total)}</p>
                    <p className="text-xs text-muted-foreground">FUN</p>
                  </div>
                </div>

                {/* Progress activated */}
                {total > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tiến trình kích hoạt</span>
                      <span className="font-medium text-green-600">{activatedPercent.toFixed(1)}%</span>
                    </div>
                    <Progress value={activatedPercent} className="h-2 bg-amber-100" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>🔒 {formatFUN(locked)} locked</span>
                      <span>⚡ {formatFUN(activated)} activated</span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  {locked > 0 && onActivate && (
                    <Button onClick={onActivate} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-sm py-2">
                      <Lock className="w-3.5 h-3.5 mr-1.5" />Activate FUN
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  )}
                  {activated > 0 && onClaim && (
                    <Button onClick={onClaim} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-sm py-2">
                      <Zap className="w-3.5 h-3.5 mr-1.5" />Claim to Wallet
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  )}
                </div>

                {/* Contract badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">Contract: {FUN_MONEY_CONTRACT.address.slice(0, 8)}...</Badge>
                  <Badge variant="outline" className="text-xs">BSC Testnet</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-6 text-center">
            <Coins className="w-10 h-10 mx-auto text-amber-400 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Kết nối ví để xem số dư FUN on-chain</p>
            <Button onClick={() => navigate('/wallet')} variant="outline" size="sm">
              <Wallet className="w-4 h-4 mr-2" />Thiết lập ví
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// MED-6: Wrap with React.memo to prevent re-renders when parent state changes
// but LightScoreDashboard props don't change (walletAddress, onActivate, onClaim are stable)
export const MemoizedLightScoreDashboard = memo(LightScoreDashboard);
