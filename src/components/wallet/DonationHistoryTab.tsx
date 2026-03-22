import { useState, useMemo } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getTodayVN } from '@/lib/vnTimezone';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Download, Loader2, RefreshCw, Search, ExternalLink,
  Copy, ArrowRight, Sparkles, CheckCircle, Clock,
  Hash, TrendingUp, Calendar as CalendarIcon, Activity, Flame, Radar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDonationHistory, useDonationStats, DonationRecord } from '@/hooks/useDonationHistory';
import { exportDonationsToCSV } from '@/utils/exportDonations';
import { useScanIncoming } from '@/hooks/useScanIncoming';
import { DonationSuccessCard } from '@/components/donations/DonationSuccessCard';
import { DonationReceivedCard } from '@/components/donations/DonationReceivedCard';
import { formatNumber, formatDate, shortenAddress } from '@/lib/formatters';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { useWalletLabelMap } from '@/hooks/useExternalWalletLabels';

type ViewMode = 'both' | 'sent' | 'received';
type TokenFilter = 'all' | 'CAMLY' | 'USDT' | 'BNB' | 'BTCB';
type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const copyToClipboard = (text: string, t: (key: string) => string) => {
  navigator.clipboard.writeText(text);
  toast.success(t('swapCopied'));
};

export function DonationHistoryTab() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const walletLabelMap = useWalletLabelMap();

  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [search, setSearch] = useState('');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
  const [selectedType, setSelectedType] = useState<'sent' | 'received'>('sent');
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  const { data: sentDonations = [], isLoading: isSentLoading, refetch: refetchSent } = useDonationHistory('sent');
  const { data: receivedDonations = [], isLoading: isReceivedLoading, refetch: refetchReceived } = useDonationHistory('received');
  const { data: stats } = useDonationStats();
  const { scan, isScanning } = useScanIncoming();

  const isLoading = isSentLoading || isReceivedLoading;

  const handleRefresh = async () => {
    await Promise.all([refetchSent(), refetchReceived()]);
    toast.success(t('swapDataRefreshed'));
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
        if (timeFilter === 'custom') {
          if (customDateRange.from) {
            const fromStart = new Date(customDateRange.from);
            fromStart.setHours(0, 0, 0, 0);
            if (created < fromStart) return false;
          }
          if (customDateRange.to) {
            const toEnd = new Date(customDateRange.to);
            toEnd.setHours(23, 59, 59, 999);
            if (created > toEnd) return false;
          }
          return true;
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
  }, [sentDonations, receivedDonations, viewMode, tokenFilter, timeFilter, search, customDateRange]);

  // Stats — computed based on viewMode but before time/token/search filters
  const statsBase = useMemo(() => {
    if (viewMode === 'sent') return sentDonations;
    if (viewMode === 'received') return receivedDonations;
    return [...sentDonations, ...receivedDonations];
  }, [sentDonations, receivedDonations, viewMode]);

  const totalAllCount = statsBase.length;

  const todayCount = useMemo(() => {
    const todayVN = getTodayVN();
    return statsBase.filter(d => {
      const created = new Date(d.created_at);
      const vnTime = new Date(created.getTime() + 7 * 60 * 60 * 1000);
      const vnDateStr = `${vnTime.getUTCFullYear()}-${String(vnTime.getUTCMonth() + 1).padStart(2, '0')}-${String(vnTime.getUTCDate()).padStart(2, '0')}`;
      return vnDateStr === todayVN;
    }).length;
  }, [statsBase]);

  const successCount = useMemo(() => statsBase.filter(d => d.status === 'confirmed').length, [statsBase]);
  const pendingCount = useMemo(() => statsBase.filter(d => d.status === 'pending').length, [statsBase]);

  const totalValue = useMemo(() => {
    const byToken: Record<string, number> = {};
    statsBase.forEach(d => {
      byToken[d.token_symbol] = (byToken[d.token_symbol] || 0) + (parseFloat(d.amount) || 0);
    });
    const entries = Object.entries(byToken).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '0';
    const [token, val] = entries[0];
    return `${formatNumber(val, 0)} ${token}`;
  }, [statsBase]);

  const handleDonationClick = (donation: DonationRecord & { _type: 'sent' | 'received' }) => {
    setSelectedDonation(donation);
    setSelectedType(donation._type);
    setIsCelebrationOpen(true);
  };

  const handleExport = () => {
    if (allDonations.length === 0) {
      toast.error(t('donationNoData'));
      return;
    }
    exportDonationsToCSV(allDonations, viewMode === 'received' ? 'received' : 'sent');
    toast.success(t('donationExported'));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{t('donationHistoryTitle')}</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('donationHistoryDesc')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={scan} disabled={isScanning || isLoading} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <Radar className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? t('donationScanning') : t('donationScanExternal')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('donationRefresh')}
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
                {mode === 'both' ? t('donationViewBoth') : mode === 'sent' ? t('donationViewSent') : t('donationViewReceived')}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            {t('donationExportData')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={<Hash className="w-4 h-4 text-primary" />} label={t('donationTotalTx')} value={totalAllCount.toString()} color="blue" />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-amber-600" />} label={t('donationTotalValue')} value={totalValue} color="amber" />
        <StatCard icon={<Calendar className="w-4 h-4 text-purple-600" />} label={t('donationToday')} value={todayCount.toString()} color="purple" />
        <StatCard icon={<CheckCircle className="w-4 h-4 text-green-600" />} label={t('donationSuccess')} value={successCount.toString()} color="green" />
        <StatCard icon={<Clock className="w-4 h-4 text-orange-500" />} label={t('donationProcessing')} value={pendingCount.toString()} color="orange" />
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('donationSearchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tokenFilter} onValueChange={v => setTokenFilter(v as TokenFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t('donationAllTokens')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('donationAllTokens')}</SelectItem>
            <SelectItem value="CAMLY">CAMLY</SelectItem>
            <SelectItem value="USDT">USDT</SelectItem>
            <SelectItem value="BNB">BNB</SelectItem>
            <SelectItem value="BTCB">BTCB</SelectItem>
          </SelectContent>
        </Select>
        <Select value={timeFilter} onValueChange={v => {
          setTimeFilter(v as TimeFilter);
          if (v !== 'custom') setCustomDateRange({ from: undefined, to: undefined });
        }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t('donationTimePeriod')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('donationAllTime')}</SelectItem>
            <SelectItem value="today">{t('donationTodayFilter')}</SelectItem>
            <SelectItem value="week">{t('donation7Days')}</SelectItem>
            <SelectItem value="month">{t('donation30Days')}</SelectItem>
            <SelectItem value="custom">{t('donationCustom')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom date range picker */}
      {timeFilter === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2 w-[160px] justify-start text-left font-normal", !customDateRange.from && "text-muted-foreground")}>
                <CalendarIcon className="w-4 h-4" />
                {customDateRange.from ? format(customDateRange.from, 'dd/MM/yyyy') : t('fromDateLabel')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[9999]" align="start">
              <Calendar
                mode="single"
                selected={customDateRange.from}
                onSelect={d => setCustomDateRange(prev => ({ ...prev, from: d }))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2 w-[160px] justify-start text-left font-normal", !customDateRange.to && "text-muted-foreground")}>
                <CalendarIcon className="w-4 h-4" />
                {customDateRange.to ? format(customDateRange.to, 'dd/MM/yyyy') : t('toDateLabel')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[9999]" align="start">
              <Calendar
                mode="single"
                selected={customDateRange.to}
                onSelect={d => setCustomDateRange(prev => ({ ...prev, to: d }))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Nút Xem Tất Cả - phía trên */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          className="w-full max-w-md gap-2 border-yellow-400 bg-white text-blue-600 hover:bg-yellow-50 hover:text-blue-700"
          onClick={() => navigate('/donations')}
        >
          {t('viewAllTxFunProfile')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Result count */}
      <p className="text-sm text-muted-foreground">{t('displayingTx')} {allDonations.length} {t('onchainTx')}</p>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : allDonations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('noTransactionsYet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allDonations.map(donation => (
            <PersonalDonationCard
              key={`${donation._type}-${donation.id}`}
              donation={donation}
              type={donation._type}
              onClick={() => handleDonationClick(donation)}
              walletLabelMap={walletLabelMap}
            />
          ))}
        </div>
      )}

      {/* Celebration modals */}
      {selectedDonation && selectedType === 'sent' && (
        <DonationSuccessCard
          isOpen={isCelebrationOpen}
          onClose={() => { setIsCelebrationOpen(false); setSelectedDonation(null); }}
          data={{
            id: selectedDonation.id,
            amount: selectedDonation.amount,
            tokenSymbol: selectedDonation.token_symbol,
            senderUsername: selectedDonation.sender?.display_name || selectedDonation.sender?.username || (selectedDonation.sender_address ? shortenAddress(selectedDonation.sender_address, 6) : t('externalWallet')),
            senderAvatarUrl: selectedDonation.sender?.avatar_url,
            senderId: selectedDonation.sender?.id,
            recipientUsername: selectedDonation.recipient?.display_name || selectedDonation.recipient?.username || 'Unknown',
            recipientAvatarUrl: selectedDonation.recipient?.avatar_url,
            recipientId: selectedDonation.recipient?.id,
            message: selectedDonation.message,
            txHash: selectedDonation.tx_hash,
            lightScoreEarned: selectedDonation.light_score_earned || 0,
            createdAt: selectedDonation.created_at,
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
            senderUsername: selectedDonation.sender?.display_name || selectedDonation.sender?.username || (selectedDonation.sender_address ? shortenAddress(selectedDonation.sender_address, 6) : t('externalWallet')),
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

// ─── Collapsible Message ────────────────────────────────────────────────────
const MSG_TRUNCATE_LENGTH = 80;

function CollapsibleMessage({ message }: { message: string }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const isLong = message.length > MSG_TRUNCATE_LENGTH;

  return (
    <div className="flex items-start gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 mb-2">
      <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="break-words">
          {isLong && !expanded ? `${message.slice(0, MSG_TRUNCATE_LENGTH)}...` : message}
        </span>
        {isLong && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev); }}
            className="ml-1 text-primary hover:text-primary/80 font-medium inline-flex items-center gap-0.5"
          >
            {expanded ? (<>{t('collapseText')} <ChevronUp className="w-3 h-3" /></>) : (<>{t('showMoreText')} <ChevronDown className="w-3 h-3" /></>)}
          </button>
        )}
      </div>
    </div>
  );
}

function formatTime(ts: string) {
  const date = new Date(ts);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const isSuccess = status === 'confirmed';
  return (
    <Badge variant="secondary" className={isSuccess ? 'bg-green-100 text-green-700 border-green-200 text-xs' : 'bg-orange-100 text-orange-700 border-orange-200 text-xs'}>
      {isSuccess ? t('txSuccess') : t('txPending')}
    </Badge>
  );
}

function UserAvatarInline({ user, onClick }: { user: { display_name?: string | null; username?: string; avatar_url?: string | null } | null; onClick?: () => void }) {
  const name = user?.display_name || user?.username || '?';
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity">
      <Avatar className="w-6 h-6 flex-shrink-0">
        {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{name[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium truncate max-w-[100px] sm:max-w-[160px] text-foreground">{name}</span>
    </button>
  );
}

// ─── Personal Donation Card (matching profile layout) ───────────────────────
function PersonalDonationCard({
  donation,
  type,
  onClick,
  walletLabelMap,
}: {
  donation: DonationRecord & { _type: 'sent' | 'received' };
  type: 'sent' | 'received';
  onClick: () => void;
  walletLabelMap: Map<string, string>;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const amount = parseFloat(donation.amount) || 0;
  const isSuccess = donation.status === 'confirmed';
  const isExternal = !!donation.is_external;

  const getWallet = (user: DonationRecord['sender'] | DonationRecord['recipient']) => {
    return user?.public_wallet_address || null;
  };

  const senderWallet = donation.sender ? getWallet(donation.sender) : donation.sender_address || null;
  const recipientWallet = getWallet(donation.recipient);

  // Resolve external wallet label
  const externalLabel = donation.is_external && donation.sender_address
    ? walletLabelMap.get(donation.sender_address.toLowerCase())
    : undefined;

  const senderDisplayName = donation.sender?.display_name || donation.sender?.username || 
    externalLabel ||
    (donation.sender_address ? shortenAddress(donation.sender_address, 6) : t('externalWallet'));
  const senderInitial = donation.sender 
    ? (donation.sender.display_name || donation.sender.username)?.charAt(0).toUpperCase() || '?'
    : externalLabel ? externalLabel.charAt(0).toUpperCase() : '🌐';

  return (
    <div
      className="border border-border rounded-lg p-2.5 space-y-1.5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer active:scale-[0.99]"
      onClick={onClick}
    >
      {/* Row 1: Badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={type === 'sent' ? 'border-red-500 text-red-600 bg-red-50 text-xs' : 'border-green-500 text-green-600 bg-green-50 text-xs'}>
            {type === 'sent' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownLeft className="w-3 h-3 mr-0.5" />}
            {type === 'sent' ? t('giftedBadge') : t('receivedBadge')}
          </Badge>
          {isExternal && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1 py-0">
              {t('externalWallet')}
            </Badge>
          )}
          {donation.light_score_earned && donation.light_score_earned > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              +{donation.light_score_earned}
            </Badge>
          )}
        </div>
        <StatusBadge status={donation.status} />
      </div>

      {/* Row 2: Sender → Recipient | Amount | Time + Tx */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          {isExternal && !donation.sender ? (
            <div className="flex items-center gap-1 min-w-0">
              <Avatar className="w-5 h-5 flex-shrink-0">
                <AvatarFallback className="text-[9px] bg-orange-100 text-orange-700">🌐</AvatarFallback>
              </Avatar>
              {donation.sender_address ? (
                <a
                  href={`https://bscscan.com/address/${donation.sender_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                  onClick={e => e.stopPropagation()}
                >
                  {shortenAddress(donation.sender_address, 6)} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">{t('externalWallet')}</span>
              )}
            </div>
          ) : (
            <UserAvatarInline
              user={donation.sender}
              onClick={() => { if (donation.sender?.id) navigate(`/profile/${donation.sender.id}`); }}
            />
          )}
          <span className="text-muted-foreground text-xs">→</span>
          <UserAvatarInline
            user={donation.recipient}
            onClick={() => { if (donation.recipient?.id) navigate(`/profile/${donation.recipient.id}`); }}
          />
        </div>

        <span className="font-bold whitespace-nowrap text-red-600 text-sm mx-auto">
          {Number(donation.amount).toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {donation.token_symbol}
        </span>

        <div className="flex items-center gap-2 whitespace-nowrap ml-auto shrink-0">
          <span className="text-sm font-medium text-primary">{formatTime(donation.created_at)}</span>
          <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{formatDate(donation.created_at)}</span>
          {donation.tx_hash && (
            <a
              href={getBscScanTxUrl(donation.tx_hash, donation.token_symbol)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-sm text-primary hover:underline flex items-center gap-0.5"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Row 3: Message */}
      {donation.message && (
        <CollapsibleMessage message={donation.message} />
      )}
    </div>
  );
}
