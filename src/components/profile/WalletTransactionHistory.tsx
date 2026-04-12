import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useWalletLabelMap } from '@/hooks/useExternalWalletLabels';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, ArrowDownLeft, ArrowUpRight, ArrowDownUp, ExternalLink, Filter, MessageSquare, ArrowRightLeft, ChevronDown, ChevronUp, CalendarDays, X, Receipt, RefreshCw, Download, Coins } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DonationReceivedCard, type DonationReceivedData } from '@/components/donations/DonationReceivedCard';
import { usePublicDonationHistory, type DonationFilter, type DonationRecord, type DonationSummary } from '@/hooks/usePublicDonationHistory';
import { usePublicWalletBalances } from '@/hooks/usePublicWalletBalances';
import { getBscScanBaseUrl } from '@/lib/chainTokenMapping';
import { WALLET_TOKENS } from '@/lib/tokens';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  userId: string;
  walletAddress?: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  username?: string;
  userCreatedAt?: string;
}

const TOKEN_ORDER = ['USDT', 'BNB', 'BTCB', 'FUN', 'CAMLY'];

function formatDate(ts: string) {
  const date = new Date(ts);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(ts: string) {
  const date = new Date(ts);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatAmount(num: number): string {
  if (num === 0) return '0';
  if (num < 0.0001) return num.toFixed(8);
  if (num < 1) return num.toFixed(4);
  return num.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
}

function StatusBadge({ status, t }: { status: string; t: (key: any) => string }) {
  if (status === 'confirmed') return <Badge className="bg-green-600 hover:bg-green-700 text-xs">{t('statusSuccess')}</Badge>;
  if (status === 'pending') return <Badge variant="secondary" className="text-xs">{t('statusProcessing')}</Badge>;
  return <Badge variant="destructive" className="text-xs">{t('statusError')}</Badge>;
}

function TokenLogo({ symbol }: { symbol: string }) {
  const token = WALLET_TOKENS.find(t => t.symbol === symbol);
  if (!token) return <span className="text-[10px] font-bold text-muted-foreground">{symbol}</span>;
  const sizeClass = symbol === 'BTC' ? 'w-8 h-8' : symbol === 'BTCB' ? 'w-[1.35rem] h-[1.35rem]' : 'w-4 h-4';
  return <img src={token.logo} alt={symbol} className={`${sizeClass} rounded-full`} />;
}

function SummaryTable({ summary, activeFilter, tokenFilter, onTokenClick }: { summary: DonationSummary; activeFilter: DonationFilter; tokenFilter: string; onTokenClick: (sym: string) => void }) {
  const { t } = useLanguage();
  const allTokens = new Set<string>();
  const showReceived = activeFilter === 'all' || activeFilter === 'received';
  const showSent = activeFilter === 'all' || activeFilter === 'sent';

  if (showReceived) Object.keys(summary.received).forEach(s => allTokens.add(s));
  if (showSent) Object.keys(summary.sent).forEach(s => allTokens.add(s));

  const tokens = TOKEN_ORDER.filter(t => allTokens.has(t));
  const extraTokens = [...allTokens].filter(t => !TOKEN_ORDER.includes(t));
  const orderedTokens = [...tokens, ...extraTokens];

  if (orderedTokens.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Chưa có giao dịch nào</p>;
  }

  return (
    <div className="space-y-1.5 mb-2">
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-emerald-50/60 to-amber-50/60 dark:from-emerald-950/20 dark:to-amber-950/20">
                <TableHead className="text-sm font-bold w-[70px] px-2 py-1.5 whitespace-nowrap">Token</TableHead>
                {showReceived && (
                  <>
                    <TableHead className="text-sm font-bold text-green-600 text-right px-2 py-1.5 whitespace-nowrap">Tổng nhận</TableHead>
                    <TableHead className="text-sm font-bold text-green-600 text-right px-2 py-1.5 whitespace-nowrap">Lệnh</TableHead>
                  </>
                )}
                {showSent && (
                  <>
                    <TableHead className="text-sm font-bold text-red-600 text-right px-2 py-1.5 whitespace-nowrap">Tổng đã tặng</TableHead>
                    <TableHead className="text-sm font-bold text-red-600 text-right px-2 py-1.5 whitespace-nowrap">Lệnh</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedTokens.map(sym => {
                const recv = summary.received[sym];
                const sent = summary.sent[sym];

                return (
                  <TableRow
                    key={sym}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/50",
                      tokenFilter === sym && "bg-primary/10 hover:bg-primary/15"
                    )}
                    onClick={() => onTokenClick(tokenFilter === sym ? 'all' : sym)}
                  >
                    <TableCell className="px-2 py-1">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <TokenLogo symbol={sym} />
                        <span className="text-sm font-bold">{sym}</span>
                      </div>
                    </TableCell>
                    {showReceived && (
                      <>
                        <TableCell className="text-right px-2 py-1 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">{formatAmount(recv?.amount ?? 0)}</span>
                        </TableCell>
                        <TableCell className="text-right px-2 py-1 whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">{recv?.count ?? 0}</span>
                        </TableCell>
                      </>
                    )}
                    {showSent && (
                      <>
                        <TableCell className="text-right px-2 py-1 whitespace-nowrap">
                          <span className="text-sm font-semibold text-red-600">{formatAmount(sent?.amount ?? 0)}</span>
                        </TableCell>
                        <TableCell className="text-right px-2 py-1 whitespace-nowrap">
                          <span className="text-sm font-semibold text-red-600">{sent?.count ?? 0}</span>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50/60 to-amber-50/60 dark:from-emerald-950/20 dark:to-amber-950/20 border border-border rounded-lg px-3 py-1.5">
        <div className="flex items-center gap-4">
          {showReceived && (
            <div className="flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-green-600" />
              <span className="text-sm text-muted-foreground">Nhận:</span>
              <span className="text-sm font-bold text-green-600">{summary.receivedCount}</span>
            </div>
          )}
          {showSent && (
            <div className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
              <span className="text-sm text-muted-foreground">Gửi:</span>
              <span className="text-sm font-bold text-red-600">{summary.sentCount}</span>
            </div>
          )}
        </div>
        <span className="text-sm font-bold text-foreground">{t('totalTxCount').replace('{count}', String(summary.totalCount))}</span>
      </div>
    </div>
  );
}

function UserAvatar({ username, displayName, avatarUrl, onClick }: { username: string | null; displayName: string | null; avatarUrl: string | null; onClick?: () => void }) {
  const name = displayName || username || '?';
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity">
      <Avatar className="w-6 h-6 flex-shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} />}
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{name[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium truncate max-w-[100px] sm:max-w-[160px] text-foreground">{name}</span>
    </button>
  );
}

function shortenAddress(addr: string) {
  if (!addr) return '???';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function TransferCard({ d }: { d: DonationRecord }) {
  const { t } = useLanguage();
  const explorerUrl = getBscScanBaseUrl(d.chain_id);
  const isIn = d.direction === 'in';

  return (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <div className="flex justify-between items-center">
        <Badge className={isIn ? 'bg-blue-600 hover:bg-blue-700 text-white text-xs' : 'bg-orange-600 hover:bg-orange-700 text-white text-xs'}>
          <ArrowRightLeft className="w-3 h-3 mr-1" />
          {isIn ? t('transferIn') : t('transferOut')}
        </Badge>
        <StatusBadge status={d.status} t={t} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <TokenLogo symbol={d.token_symbol} />
          <span className="font-bold">{Number(d.amount).toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {d.token_symbol}</span>
        </div>
      </div>

      {d.counterparty_address && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{isIn ? t('fromLabel') : t('toLabel')}</span>
          <a
            href={`${explorerUrl}/address/${d.counterparty_address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            {shortenAddress(d.counterparty_address)} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{formatDate(d.created_at)} {formatTime(d.created_at)}</span>
      </div>

      {d.tx_hash && (
        <a href={`${explorerUrl}/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
          Tx: {d.tx_hash.slice(0, 10)}...{d.tx_hash.slice(-6)} <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function SwapCard({ d }: { d: DonationRecord }) {
  const { t } = useLanguage();
  const explorerUrl = getBscScanBaseUrl(d.chain_id);
  return (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <div className="flex justify-between items-center">
        <Badge className="bg-violet-600 hover:bg-violet-700 text-white text-xs">
          <ArrowDownUp className="w-3 h-3 mr-1" />
          Swap
        </Badge>
        <StatusBadge status={d.status} t={t} />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          <TokenLogo symbol={d.from_symbol!} />
          <span className="font-bold">{Number(d.from_amount).toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {d.from_symbol}</span>
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="flex items-center gap-1.5">
          <TokenLogo symbol={d.to_symbol!} />
          <span className="font-bold">{Number(d.to_amount).toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {d.to_symbol}</span>
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{formatDate(d.created_at)} {formatTime(d.created_at)}</span>
      </div>

      {d.tx_hash && (
        <a href={`${explorerUrl}/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
          Tx: {d.tx_hash.slice(0, 10)}...{d.tx_hash.slice(-6)} <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

const MSG_TRUNCATE_LENGTH = 80;

function CollapsibleMessage({ message }: { message: string }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const isLong = message.length > MSG_TRUNCATE_LENGTH;

  return (
    <div className="flex items-start gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
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
            {expanded ? (<>Thu gọn <ChevronUp className="w-3 h-3" /></>) : (<>Xem thêm <ChevronDown className="w-3 h-3" /></>)}
          </button>
        )}
      </div>
    </div>
  );
}

function DonationCard({ d, userId, walletLabelMap }: { d: DonationRecord; userId: string; walletLabelMap: Map<string, string> }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showCard, setShowCard] = useState(false);
  const isTransfer = d.type === 'transfer';
  const isSent = isTransfer ? d.direction === 'out' : d.sender_id === userId;
  const explorerUrl = getBscScanBaseUrl(d.chain_id);
  const isExternal = d.is_external || (!d.sender_id && d.recipient_id) || isTransfer;

  const externalLabel = isExternal && d.sender_address
    ? walletLabelMap.get(d.sender_address.toLowerCase())
    : undefined;

  const senderName = d.sender_display_name || d.sender_username || 
    externalLabel ||
    (d.sender_address ? shortenAddress(d.sender_address) : t('externalWallet'));
  const senderAvatar = d.sender_avatar_url;

  const cardData: DonationReceivedData = {
    id: d.id,
    amount: d.amount,
    tokenSymbol: d.token_symbol,
    senderUsername: d.sender_username || senderName,
    senderDisplayName: d.sender_display_name || externalLabel,
    senderAvatarUrl: d.sender_avatar_url,
    senderId: d.sender_id || '',
    recipientUsername: d.recipient_username || undefined,
    recipientDisplayName: d.recipient_display_name,
    recipientAvatarUrl: d.recipient_avatar_url,
    message: d.message,
    txHash: d.tx_hash,
    createdAt: d.created_at,
    status: d.status,
  };

  return (
    <>
    <DonationReceivedCard isOpen={showCard} onClose={() => setShowCard(false)} data={cardData} />
    <div className="border border-border rounded-lg p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={isSent ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30 text-xs' : 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30 text-xs'}>
            {isSent ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownLeft className="w-3 h-3 mr-0.5" />}
            {isTransfer ? (isSent ? 'Chuyển ví' : 'Nhận ví ngoài') : (isSent ? t('donatedLabel') : t('receivedBadge'))}
          </Badge>
          {isExternal && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1 py-0">
              Ví ngoài
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={d.status} t={t} />
          <button
            onClick={(e) => { e.stopPropagation(); setShowCard(true); }}
            className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-full px-2 py-0.5 transition-colors"
            title="Xem biên nhận"
          >
            <Receipt className="w-3 h-3" />
            Card
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          {isExternal && !d.sender_id ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">
                  {externalLabel ? externalLabel.charAt(0).toUpperCase() : '🌐'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                {externalLabel && (
                  <span className="text-xs font-semibold text-foreground truncate">{externalLabel}</span>
                )}
                {d.sender_address ? (
                  <a
                    href={`${explorerUrl}/address/${d.sender_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    {shortenAddress(d.sender_address)} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">Ví ngoài</span>
                )}
              </div>
            </div>
          ) : (
            <UserAvatar
              username={d.sender_username}
              displayName={d.sender_display_name}
              avatarUrl={d.sender_avatar_url}
              onClick={() => d.sender_username && navigate(`/${d.sender_username}`)}
            />
          )}
          <span className="text-muted-foreground text-xs">→</span>
          <UserAvatar
            username={d.recipient_username}
            displayName={d.recipient_display_name}
            avatarUrl={d.recipient_avatar_url}
            onClick={() => d.recipient_username && navigate(`/${d.recipient_username}`)}
          />
        </div>

        <span className="font-bold whitespace-nowrap text-red-600 text-sm mx-auto">{Number(d.amount).toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {d.token_symbol}</span>

        <div className="flex items-center gap-2 whitespace-nowrap ml-auto">
          <span className="text-sm font-medium text-primary">{formatTime(d.created_at)}</span>
          <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{formatDate(d.created_at)}</span>
          {d.tx_hash && (
            <a href={`${explorerUrl}/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-0.5">
              Tx: {d.tx_hash.slice(0, 6)}...{d.tx_hash.slice(-4)} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {d.message && <CollapsibleMessage message={d.message} />}
    </div>
    </>
  );
}

export function WalletTransactionHistory({ userId, walletAddress, userDisplayName, userAvatarUrl, username, userCreatedAt }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [tokenFilter, setTokenFilter] = useState<string>('all');
  const navigate = useNavigate();
  const walletLabelMap = useWalletLabelMap();
  const { donations, loading, error, filter, hasMore, summary, summaryLoading, changeFilter, changeDateRange, fetchDonations, fetchSummary, loadMore } = usePublicDonationHistory(userId, userCreatedAt);
  const { balances: walletBalances } = usePublicWalletBalances(open ? walletAddress : undefined);

  useEffect(() => {
    if (open && userId) {
      fetchDonations(1);
      fetchSummary();
    }
  }, [open, userId, fetchDonations, fetchSummary]);

  const handleDateChange = (from: Date | undefined, to: Date | undefined) => {
    setFromDate(from);
    setToDate(to);
    const fromStr = from ? format(from, 'yyyy-MM-dd') : null;
    const toStr = to ? format(to, 'yyyy-MM-dd') : null;
    changeDateRange(fromStr, toStr);
  };

  const clearDateRange = () => {
    setFromDate(undefined);
    setToDate(undefined);
    changeDateRange(null, null);
  };

  const filters: { key: DonationFilter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'received', label: t('receivedBadge') },
    { key: 'sent', label: t('donatedLabel') },
  ];

  const displayName = userDisplayName || username || '?';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold px-4 h-10 bg-gradient-to-r from-gold/90 to-amber-500/90 hover:from-gold hover:to-amber-500 text-primary-foreground border-0 shadow-md hover:shadow-lg transition-all duration-300">
          <Clock className="w-4 h-4 mr-2" />
          {t('transactionHistory')}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[905px] max-w-[95vw] sm:max-w-[905px] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-1.5 text-xl uppercase tracking-wider font-extrabold w-full" style={{ color: '#2E7D32', textShadow: '0 1px 2px rgba(46,125,50,0.2)' }}>
              <Clock className="w-5 h-5" style={{ color: '#2E7D32' }} />
              Lịch sử giao dịch cá nhân
            </DialogTitle>
            <DialogDescription className="sr-only">{t('personalTxHistoryDesc')}</DialogDescription>
          </DialogHeader>

          {/* Filters + Date Range row */}
          <div className="flex items-center gap-1.5 py-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {filters.map(f => (
              <Button key={f.key} size="sm" variant={filter === f.key ? 'secondary' : 'ghost'} onClick={() => changeFilter(f.key)} className="h-7 text-sm px-3">
                {f.label}
              </Button>
            ))}
            <Select value={tokenFilter} onValueChange={setTokenFilter}>
              <SelectTrigger className="h-7 w-[100px] text-xs">
                <Coins className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="all">Tất cả</SelectItem>
                {TOKEN_ORDER.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                <SelectItem value="BTC">BTC</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={async () => {
                  if (!donations.length) return;
                  const { exportPublicDonationsToPDF } = await import('@/utils/exportDonations');
                  exportPublicDonationsToPDF(donations, filter, `tx-history-${filter}-${new Date().toISOString().split('T')[0]}.pdf`);
                }}
                title="Xuất PDF"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { fetchDonations(1); fetchSummary(); }}
                disabled={loading}
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className={cn("h-8 text-xs gap-1 min-w-[110px]", fromDate && "border-primary text-primary")}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    {fromDate ? format(fromDate, 'dd/MM/yyyy') : t('fromDateLabel')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="end">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(d) => handleDateChange(d, toDate)}
                    disabled={(date) => date > new Date() || (toDate ? date > toDate : false)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className={cn("h-8 text-xs gap-1 min-w-[110px]", toDate && "border-primary text-primary")}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    {toDate ? format(toDate, 'dd/MM/yyyy') : t('toDateLabel')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="end">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(d) => handleDateChange(fromDate, d)}
                    disabled={(date) => date > new Date() || (fromDate ? date < fromDate : false)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {/* Clear date */}
              {(fromDate || toDate) && (
                <Button size="sm" variant="ghost" onClick={clearDateRange} className="h-8 w-8 p-0">
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Summary Section — always visible */}
          <SummaryTable summary={summary} activeFilter={filter} tokenFilter={tokenFilter} onTokenClick={setTokenFilter} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {error && <p className="text-destructive text-sm">{error}</p>}

          {loading && donations.length === 0 ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : donations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Không có giao dịch nào</p>
          ) : (
            <>
              <div className="space-y-2">
                {donations.filter(d => d.type !== 'swap').filter(d => tokenFilter === 'all' || d.token_symbol === tokenFilter).map(d => (
                  <DonationCard key={d.id} d={d} userId={userId} walletLabelMap={walletLabelMap} />
                ))}
              </div>

              {hasMore && !loading && (
                <div className="flex justify-center mt-4 pb-2">
                  <Button variant="outline" onClick={loadMore} size="sm">
                    Tải thêm
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
