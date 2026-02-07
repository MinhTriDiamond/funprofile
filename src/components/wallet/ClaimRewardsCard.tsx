import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  Gift,
  FileText,
  Heart,
  MessageCircle,
  Users,
  Send,
  RefreshCw,
  Loader2,
  Rocket,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePendingActions, GroupedActions } from '@/hooks/usePendingActions';
import { formatFUN } from '@/config/pplp';
import funLogo from '@/assets/tokens/fun-logo.png';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  post: <FileText className="w-4 h-4 text-blue-500" />,
  reaction: <Heart className="w-4 h-4 text-pink-500" />,
  comment: <MessageCircle className="w-4 h-4 text-green-500" />,
  share: <Send className="w-4 h-4 text-purple-500" />,
  friend: <Users className="w-4 h-4 text-cyan-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  post: 'Tạo bài viết',
  reaction: 'Cảm xúc',
  comment: 'Bình luận',
  share: 'Chia sẻ',
  friend: 'Kết bạn',
  livestream: 'Phát trực tiếp',
  new_user_bonus: 'Thưởng người mới',
};

interface ClaimRewardsCardProps {
  onClaimSuccess?: (requestId: string) => void;
}

export const ClaimRewardsCard = ({ onClaimSuccess }: ClaimRewardsCardProps) => {
  const {
    actions,
    groupedByType,
    totalAmount,
    isLoading,
    refetch,
    claim,
    isClaiming,
  } = usePendingActions();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleClaimAll = async () => {
    const actionIds = actions.map(a => a.id);
    const result = await claim(actionIds);
    if (result.success && result.requestId && onClaimSuccess) {
      onClaimSuccess(result.requestId);
    }
  };

  const toggleExpand = (type: string) => {
    setExpandedType(expandedType === type ? null : type);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" />
          <p className="text-muted-foreground mt-2">Đang tải Light Actions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5" />
            Light Actions Chờ Claim
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {actions.length === 0 ? (
          <div className="text-center py-8">
            <Gift className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Chưa có Light Actions nào</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tạo bài viết, bình luận, tương tác để kiếm FUN!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Action Type List */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {groupedByType.map((group) => (
                  <div key={group.action_type} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpand(group.action_type)}
                    >
                      <div className="flex items-center gap-3">
                        {ACTION_ICONS[group.action_type] || <Sparkles className="w-4 h-4 text-amber-500" />}
                        <span className="font-medium">
                          {ACTION_LABELS[group.action_type] || group.action_type}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {group.count}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-600">
                          +{formatFUN(group.total_amount)} FUN
                        </span>
                        {expandedType === group.action_type ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Items */}
                    {expandedType === group.action_type && (
                      <div className="border-t bg-muted/30 px-3 py-2 space-y-1">
                        {group.items.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm py-1"
                          >
                            <span className="text-muted-foreground truncate max-w-[200px]">
                              {item.content_preview || 'Light Action'}
                            </span>
                            <span className="text-amber-600 font-medium">
                              +{formatFUN(item.mint_amount)} FUN
                            </span>
                          </div>
                        ))}
                        {group.items.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">
                            +{group.items.length - 5} actions khác
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Total and Claim Button */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">Tổng cộng:</span>
                <div className="flex items-center gap-2">
                  <img src={funLogo} alt="FUN" className="w-6 h-6 rounded-full" />
                  <span className="text-2xl font-bold text-amber-600">
                    {formatFUN(totalAmount)} FUN
                  </span>
                </div>
              </div>

              <Button
                onClick={handleClaimAll}
                disabled={isClaiming || actions.length === 0}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold py-6"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" />
                    Claim {formatFUN(totalAmount)} FUN
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-3">
                💡 Sau khi claim, Admin sẽ ký và gửi FUN lên blockchain cho bạn
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
