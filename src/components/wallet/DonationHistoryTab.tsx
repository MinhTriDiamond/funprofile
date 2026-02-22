import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Loader2, RefreshCw, Search, ExternalLink,
  Copy, ArrowRight, Sparkles, CheckCircle, Clock,
  Hash, TrendingUp, Calendar, Activity, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDonationHistory, useDonationStats, DonationRecord } from '@/hooks/useDonationHistory';
import { exportDonationsToCSV } from '@/utils/exportDonations';
import { GiftCelebrationModal } from '@/components/donations/GiftCelebrationModal';
import { DonationReceivedCard } from '@/components/donations/DonationReceivedCard';
import { formatNumber, formatDate, shortenAddress } from '@/lib/formatters';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';

type ViewMode = 'both' | 'sent' | 'received';
type TokenFilter = 'all' | 'CAMLY' | 'USDT' | 'BNB' | 'BTCB';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Đã sao chép!');
};

export function DonationHistoryTab() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
  const [selectedType, setSelectedType] = useState<'sent' | 'received'>('sent');
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  const { data: sentDonations = [], isLoading: isSentLoading, refetch: refetchSent } = useDonationHistory('sent');
  const { data: receivedDonations = [], isLoading: isReceivedLoading, refetch: refetchReceived } = useDonationHistory('received');
  const { data: stats } = useDonationStats();

  const isLoading = isSentLoading || isReceivedLoading;

  const handleRefresh = async () => {
    await Promise.all([refetchSent(), refetchReceived()]);
    toast.success('Đã làm mới dữ liệu!');
  };

  // Combine and filter
  const allDonations = useMemo(() => {
    const sent = sentDonations.map(d => ({ ...d, _type: 'sent' as const }));
    const received = receivedDonations.map(d => ({ ...d, _type: 'received' as const }));

    let combined: (DonationRecord & { _type: 'sent' | 'received' })[] = [];
    if (viewMode === 'both') combined = [...sent, ...received];
    else if (viewMode === 'sent') combined = sent;
    else combined = received;

    // Sort by date
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Token filter
    if (tokenFilter !== 'all') {
      combined = combined.filter(d => d.token_symbol === tokenFilter);
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      combined = combined.filter(d => {
        const created = new Date(d.created_at);
        if (timeFilter === 'today') {
          return created.toDateString() === now.toDateString();
        }
        if (timeFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return created >= weekAgo;
        }
        if (timeFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return created >= monthAgo;
        }
        return true;
      });
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      combined = combined.filter(d =>
        d.sender?.username?.toLowerCase().includes(q) ||
        d.sender?.display_name?.toLowerCase().includes(q) ||
        d.recipient?.username?.toLowerCase().includes(q) ||
        d.recipient?.display_name?.toLowerCase().includes(q) ||
        d.tx_hash?.toLowerCase().includes(q) ||
        d.message?.toLowerCase().includes(q)
      );
    }

    return combined;
  }, [sentDonations, receivedDonations, viewMode, tokenFilter, timeFilter, search]);

  // Stats
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return allDonations.filter(d => new Date(d.created_at).toDateString() === today).length;
  }, [allDonations]);

  const successCount = useMemo(() => allDonations.filter(d => d.status === 'confirmed').length, [allDonations]);
  const pendingCount = useMemo(() => allDonations.filter(d => d.status === 'pending').length, [allDonations]);

  const totalValue = useMemo(() => {
    const byToken: Record<string, number> = {};
    allDonations.forEach(d => {
      byToken[d.token_symbol] = (byToken[d.token_symbol] || 0) + (parseFloat(d.amount) || 0);
    });
    // Return dominant token value string
    const entries = Object.entries(byToken).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '0';
    const [token, val] = entries[0];
    const formatted = val >= 1_000_000_000 ? `${(val / 1_000_000_000).toFixed(2)}B` :
      val >= 1_000_000 ? `${(val / 1_000_000).toFixed(2)}M` :
      formatNumber(val, 2);
    return `${formatted} ${token}`;
  }, [allDonations]);

  const handleDonationClick = (donation: DonationRecord & { _type: 'sent' | 'received' }) => {
    setSelectedDonation(donation);
    setSelectedType(donation._type);
    setIsCelebrationOpen(true);
  };

  const handleExport = () => {
    if (allDonations.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportDonationsToCSV(allDonations, viewMode === 'received' ? 'received' : 'sent');
    toast.success('Đã xuất dữ liệu!');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Lịch Sử Giao Dịch Cá Nhân</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Giao dịch onchain liên quan đến ví của bạn (Tặng thưởng, Ủng hộ, Rút thưởng)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <div className="flex rounded-lg border overflow-hidden">
            {(['both', 'sent', 'received'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {mode === 'both' ? 'Xem cả hai' : mode === 'sent' ? 'Đã gửi' : 'Đã nhận'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Xuất dữ liệu
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={<Hash className="w-4 h-4 text-primary" />} label="Tổng giao" value={allDonations.length.toString()} color="blue" />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-amber-600" />} label="Tổng giá trị" value={totalValue} color="amber" />
        <StatCard icon={<Calendar className="w-4 h-4 text-purple-600" />} label="Hôm nay" value={todayCount.toString()} color="purple" />
        <StatCard icon={<CheckCircle className="w-4 h-4 text-green-600" />} label="Thành công" value={successCount.toString()} color="green" />
        <StatCard icon={<Clock className="w-4 h-4 text-orange-500" />} label="Xử lý" value={pendingCount.toString()} color="orange" />
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, ví, tx hash..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tokenFilter} onValueChange={v => setTokenFilter(v as TokenFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Cả token" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cả token</SelectItem>
            <SelectItem value="CAMLY">CAMLY</SelectItem>
            <SelectItem value="USDT">USDT</SelectItem>
            <SelectItem value="BNB">BNB</SelectItem>
            <SelectItem value="BTCB">BTCB</SelectItem>
          </SelectContent>
        </Select>
        <Select value={timeFilter} onValueChange={v => setTimeFilter(v as TimeFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Cả gian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cả gian</SelectItem>
            <SelectItem value="today">Hôm nay</SelectItem>
            <SelectItem value="week">7 ngày</SelectItem>
            <SelectItem value="month">30 ngày</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Nút Xem Tất Cả - phía trên */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          className="w-full max-w-md gap-2 border-yellow-400 bg-white text-blue-600 hover:bg-yellow-50 hover:text-blue-700"
          onClick={() => navigate('/donations')}
        >
          Xem Tất Cả Giao Dịch FUN Profile
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Result count */}
      <p className="text-sm text-muted-foreground">Hiển thị {allDonations.length} giao dịch onchain</p>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : allDonations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có giao dịch nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allDonations.map(donation => (
            <PersonalDonationCard
              key={`${donation._type}-${donation.id}`}
              donation={donation}
              type={donation._type}
              onClick={() => handleDonationClick(donation)}
            />
          ))}
        </div>
      )}

      {/* Celebration modals */}
      {selectedDonation && selectedType === 'sent' && (
        <GiftCelebrationModal
          isOpen={isCelebrationOpen}
          onClose={() => { setIsCelebrationOpen(false); setSelectedDonation(null); }}
          editable={false}
          data={{
            id: selectedDonation.id,
            amount: selectedDonation.amount,
            tokenSymbol: selectedDonation.token_symbol,
            senderUsername: selectedDonation.sender?.display_name || selectedDonation.sender?.username || (selectedDonation.sender_address ? shortenAddress(selectedDonation.sender_address, 6) : 'Ví ngoài'),
            senderAvatarUrl: selectedDonation.sender?.avatar_url,
            senderId: selectedDonation.sender?.id,
            recipientUsername: selectedDonation.recipient?.display_name || selectedDonation.recipient?.username || 'Unknown',
            recipientAvatarUrl: selectedDonation.recipient?.avatar_url,
            recipientId: selectedDonation.recipient?.id,
            message: selectedDonation.message,
            txHash: selectedDonation.tx_hash,
            lightScoreEarned: selectedDonation.light_score_earned || 0,
            createdAt: selectedDonation.created_at,
            cardTheme: (selectedDonation as any).card_theme,
            cardBackground: (selectedDonation as any).card_background,
            cardSound: (selectedDonation as any).card_sound,
          }}
        />
      )}

      {selectedDonation && selectedType === 'received' && (
        <DonationReceivedCard
          isOpen={isCelebrationOpen}
          onClose={() => { setIsCelebrationOpen(false); setSelectedDonation(null); }}
          data={{
            id: selectedDonation.id,
            amount: selectedDonation.amount,
            tokenSymbol: selectedDonation.token_symbol,
            senderUsername: selectedDonation.sender?.display_name || selectedDonation.sender?.username || (selectedDonation.sender_address ? shortenAddress(selectedDonation.sender_address, 6) : 'Ví ngoài'),
            senderAvatarUrl: selectedDonation.sender?.avatar_url,
            senderId: selectedDonation.sender?.id || '',
            message: selectedDonation.message,
            txHash: selectedDonation.tx_hash,
            createdAt: selectedDonation.created_at,
            recipientUsername: selectedDonation.recipient?.username,
            recipientDisplayName: selectedDonation.recipient?.display_name,
            recipientAvatarUrl: selectedDonation.recipient?.avatar_url,
          }}
        />
      )}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-bold text-foreground text-sm leading-tight">{value}</div>
    </div>
  );
}

// ─── Personal Donation Card ─────────────────────────────────────────────────
function PersonalDonationCard({
  donation,
  type,
  onClick,
}: {
  donation: DonationRecord & { _type: 'sent' | 'received' };
  type: 'sent' | 'received';
  onClick: () => void;
}) {
  const navigate = useNavigate();
  const amount = parseFloat(donation.amount) || 0;
  const isSuccess = donation.status === 'confirmed';

  const getWallet = (user: DonationRecord['sender'] | DonationRecord['recipient']) => {
    return user?.public_wallet_address || null;
  };

  const senderWallet = donation.sender ? getWallet(donation.sender) : donation.sender_address || null;
  const recipientWallet = getWallet(donation.recipient);

  const senderDisplayName = donation.sender?.display_name || donation.sender?.username || 
    (donation.sender_address ? shortenAddress(donation.sender_address, 6) : 'Ví ngoài');
  const senderInitial = donation.sender 
    ? (donation.sender.display_name || donation.sender.username)?.charAt(0).toUpperCase() || '?'
    : '🌐';

  return (
    <div
      className="bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer active:scale-[0.99]"
      onClick={onClick}
    >
      {/* Row 1: Sender → Recipient */}
      <div className="flex items-center justify-between gap-4 mb-3">
        {/* Sender */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            className="w-10 h-10 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={e => { e.stopPropagation(); if (donation.sender?.id) navigate(`/profile/${donation.sender.id}`); }}
          >
            <AvatarImage src={donation.sender?.avatar_url || undefined} />
            <AvatarFallback>{senderInitial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="font-semibold text-sm text-foreground hover:underline truncate max-w-[120px] block text-left"
                onClick={e => { e.stopPropagation(); if (donation.sender?.id) navigate(`/profile/${donation.sender.id}`); }}
              >
                {senderDisplayName}
              </button>
              {donation.is_external && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1 py-0">
                  Ví ngoài
                </Badge>
              )}
            </div>
            {senderWallet && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="truncate max-w-[80px]">{shortenAddress(senderWallet, 4)}</span>
                <button onClick={e => { e.stopPropagation(); copyToClipboard(senderWallet); }} className="hover:text-foreground">
                  <Copy className="w-3 h-3" />
                </button>
                <a href={`https://bscscan.com/address/${senderWallet}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-foreground">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Arrow + Amount */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <span className={`text-sm font-bold ${type === 'received' ? 'text-emerald-600' : 'text-foreground'}`}>
            {type === 'received' ? '+' : ''}{formatNumber(amount, amount < 1 ? 3 : amount < 100 ? 2 : 0)} {donation.token_symbol}
          </span>
        </div>

        {/* Recipient */}
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <button
              type="button"
              className="font-semibold text-sm text-foreground hover:underline truncate max-w-[120px] block text-right"
              onClick={e => { e.stopPropagation(); if (donation.recipient?.id) navigate(`/profile/${donation.recipient.id}`); }}
            >
              {donation.recipient?.display_name || donation.recipient?.username || 'Unknown'}
            </button>
            {recipientWallet && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                <span className="truncate max-w-[80px]">{shortenAddress(recipientWallet, 4)}</span>
                <button onClick={e => { e.stopPropagation(); copyToClipboard(recipientWallet); }} className="hover:text-foreground">
                  <Copy className="w-3 h-3" />
                </button>
                <a href={`https://bscscan.com/address/${recipientWallet}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-foreground">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
          <Avatar
            className="w-10 h-10 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={e => { e.stopPropagation(); if (donation.recipient?.id) navigate(`/profile/${donation.recipient.id}`); }}
          >
            <AvatarImage src={donation.recipient?.avatar_url || undefined} />
            <AvatarFallback>{(donation.recipient?.display_name || donation.recipient?.username)?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Row 2: Badges */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 text-xs">
          {type === 'sent' ? 'Tặng thưởng' : 'Đã nhận'}
        </Badge>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
          Trên chuỗi
        </Badge>
        {donation.light_score_earned && donation.light_score_earned > 0 && (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs gap-1">
            <Sparkles className="w-3 h-3" />
            +{donation.light_score_earned}
          </Badge>
        )}
      </div>

      {/* Row 3: Message */}
      {donation.message && (
        <p className="text-sm text-muted-foreground italic mb-3 leading-relaxed">
          "{donation.message}"
        </p>
      )}

      {/* Row 4: Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-orange-400" />
          )}
          <span>{isSuccess ? 'Thành công' : 'Đang xử lý'}</span>
          <span>•</span>
          <span>{formatDate(donation.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>TX: {shortenAddress(donation.tx_hash, 4)}</span>
          <button
            onClick={e => { e.stopPropagation(); copyToClipboard(donation.tx_hash); }}
            className="hover:text-foreground transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
          <a
            href={getBscScanTxUrl(donation.tx_hash, donation.token_symbol)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            className="text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1"
          >
            🎴 Xem Thẻ
          </button>
        </div>
      </div>
    </div>
  );
}
