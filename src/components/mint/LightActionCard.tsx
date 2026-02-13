import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock, CheckCircle2, Loader2, Sparkles, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getTxUrl } from '@/config/pplp';

const ACTION_LABELS: Record<string, string> = {
  post: '📝 Tạo bài viết',
  comment: '💬 Bình luận',
  reaction: '❤️ Cảm xúc',
  share: '🔄 Chia sẻ',
  friend: '🤝 Kết bạn',
  livestream: '📺 Phát trực tiếp',
  new_user_bonus: '🎁 Thưởng người mới',
  donate: '🎁 Tặng quà',
};

const PILLAR_SHORT = ['S', 'T', 'H', 'C', 'U'];

interface LightActionCardProps {
  action: {
    id: string;
    action_type: string;
    content_preview: string | null;
    mint_amount: number | null;
    light_score: number;
    created_at: string;
    mint_status: string;
    tx_hash?: string | null;
    quality_score?: number;
    impact_score?: number;
    integrity_score?: number;
    unity_score?: number;
    base_reward?: number;
  };
  onClaim?: (id: string) => void;
  isClaiming?: boolean;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">🟢 Sẵn sàng mint</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">🟡 Chờ duyệt</Badge>;
    case 'pending_sig':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">🟠 Chờ Admin ký</Badge>;
    case 'minted':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">🔵 Đã nhận FUN</Badge>;
    case 'confirmed':
      return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs">🟣 Đã mint on-chain</Badge>;
    case 'processing':
      return <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs">⏳ Đang xử lý</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

export const LightActionCard = ({ action, onClaim, isClaiming }: LightActionCardProps) => {
  return (
    <div className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Action type + time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {ACTION_LABELS[action.action_type] || action.action_type}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(action.created_at), { addSuffix: true, locale: vi })}
            </span>
          </div>

          {/* Content preview */}
          {action.content_preview && (
            <p className="text-xs text-muted-foreground truncate">{action.content_preview}</p>
          )}

          {/* Light Score + Pillars */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              LS: {Math.round(action.light_score)}
            </span>
            {/* Pillar scores compact view */}
            <div className="flex gap-1">
              {PILLAR_SHORT.map((p, i) => {
                const scores = [
                  action.quality_score,
                  action.impact_score,
                  action.integrity_score,
                  action.base_reward ? action.base_reward / 100 : undefined,
                  action.unity_score ? action.unity_score / 100 : undefined,
                ];
                const val = scores[i];
                return (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    {p}:{val != null ? val.toFixed(1) : '-'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right side: amount + status */}
        <div className="text-right flex-shrink-0 space-y-2">
          <p className="text-lg font-bold text-amber-600">+{action.mint_amount || 0} FUN</p>
          {getStatusBadge(action.mint_status)}

          {/* Claim button for approved actions */}
          {action.mint_status === 'approved' && onClaim && (
            <Button
              size="sm"
              onClick={() => onClaim(action.id)}
              disabled={isClaiming}
              className="w-full mt-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-xs h-7"
            >
              {isClaiming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
              Claim
            </Button>
          )}

          {/* BSCScan link for minted */}
          {(action.mint_status === 'minted' || action.mint_status === 'confirmed') && action.tx_hash && (
            <a
              href={getTxUrl(action.tx_hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
            >
              BSCScan <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
