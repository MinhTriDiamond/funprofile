import { Gift, ExternalLink, Sparkles, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DonationRecord } from '@/hooks/useDonationHistory';
import { formatDate, formatNumber, shortenAddress } from '@/lib/formatters';

interface DonationHistoryItemProps {
  donation: DonationRecord;
  type: 'sent' | 'received';
}

export function DonationHistoryItem({ donation, type }: DonationHistoryItemProps) {
  const otherUser = type === 'sent' ? donation.recipient : donation.sender;
  const amount = parseFloat(donation.amount) || 0;
  
  const getBscScanUrl = (txHash: string) => `https://bscscan.com/tx/${txHash}`;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      {/* Header - Amount and User */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {formatNumber(amount)} {donation.token_symbol}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              {type === 'sent' ? '→' : '←'}
              <Avatar className="w-4 h-4">
                <AvatarImage src={otherUser?.avatar_url || ''} />
                <AvatarFallback className="text-[10px] bg-primary text-white">
                  {otherUser?.username?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">@{otherUser?.username || 'Unknown'}</span>
            </div>
          </div>
        </div>
        
        {/* Light Score Badge */}
        {donation.light_score_earned && donation.light_score_earned > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-full border border-yellow-200">
            <Sparkles className="w-3 h-3 text-yellow-600" />
            <span className="text-xs font-semibold text-yellow-700">
              +{donation.light_score_earned}
            </span>
          </div>
        )}
      </div>

      {/* Message */}
      {donation.message && (
        <div className="flex items-start gap-2 mb-3 pl-11">
          <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600 italic">"{donation.message}"</p>
        </div>
      )}

      {/* Footer - Time and TX */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pl-11">
        <span>📅 {formatDate(donation.created_at)}</span>
        <a
          href={getBscScanUrl(donation.tx_hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          🔗 TX: {shortenAddress(donation.tx_hash, 4)}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
