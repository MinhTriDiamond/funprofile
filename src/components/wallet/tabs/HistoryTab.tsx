import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, ArrowDownLeft, ArrowUpRight, ExternalLink, Filter, MessageSquare, ChevronDown, ChevronUp, CalendarDays, X, ArrowRight } from 'lucide-react';
import { usePublicDonationHistory, type DonationFilter, type DonationRecord, type DonationSummary } from '@/hooks/usePublicDonationHistory';
import { getBscScanBaseUrl } from '@/lib/chainTokenMapping';
import { WALLET_TOKENS } from '@/lib/tokens';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface Props {
  walletAddress?: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  username?: string;
  userCreatedAt?: string;
}

const TOKEN_ORDER = ['USDT', 'BNB', 'BTCB', 'FUN', 'CAMLY'];

function formatDateVN(ts: string) {
  const date = new Date(ts);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTimeVN(ts: string) {
  const date = new Date(ts);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatAmount(num: number): string {
  if (num === 0) return '0';
  if (num < 0.0001) return num.toFixed(8);
  if (num < 1) return num.toFixed(4);
  return num.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'confirmed') return <Badge className="bg-green-600 hover:bg-green-700 text-xs">Thành công</Badge>;
  if (status === 'pending') return <Badge variant="secondary" className="text-xs">Đang xử lý</Badge>;
  return <Badge variant="destructive" className="text-xs">Lỗi</Badge>;
}

function TokenLogo({ symbol }: { symbol: string }) {
  const token = WALLET_TOKENS.find(t => t.symbol === symbol);
  if (!token) return <span className="text-[10px] font-bold text-muted-foreground">{symbol}</span>;
  return <img src={token.logo} alt={symbol} className="w-4 h-4 rounded-full" />;
}

function SummaryTable({ summary, activeFilter }: { summary: DonationSummary; activeFilter: DonationFilter }) {
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
                  <TableRow key={sym}>
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
        <span className="text-sm font-bold text-foreground">Tổng: {summary.totalCount} GD</span>
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

const MSG_TRUNCATE_LENGTH = 80;

function CollapsibleMessage({ message }: { message: string }) {
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

function DonationCard({ d, userId }: { d: DonationRecord; userId: string }) {
  const navigate = useNavigate();
  const isSent = d.sender_id === userId;
  const explorerUrl = getBscScanBaseUrl(d.chain_id);
  const isExternal = d.is_external || (!d.sender_id && d.recipient_id);

  return (
    <div className="border border-border rounded-lg p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={isSent ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30 text-xs' : 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30 text-xs'}>
            {isSent ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownLeft className="w-3 h-3 mr-0.5" />}
            {isSent ? 'Đã tặng' : 'Đã nhận'}
          </Badge>
          {isExternal && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1 py-0">
              Ví ngoài
            </Badge>
          )}
        </div>
        <StatusBadge status={d.status} />
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          {isExternal && !d.sender_id ? (
            <div className="flex items-center gap-1 min-w-0">
              <Avatar className="w-5 h-5 flex-shrink-0">
                <AvatarFallback className="text-[9px] bg-orange-100 text-orange-700">🌐</AvatarFallback>
              </Avatar>
              {d.sender_address ? (
                <a
                  href={`${explorerUrl}/address/${d.sender_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                  onClick={e => e.stopPropagation()}
                >
                  {shortenAddress(d.sender_address)} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">Ví ngoài</span>
              )}
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

        <span className="font-bold whitespace-nowrap mx-auto text-center text-red-600 text-sm">{Number(d.amount).toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {d.token_symbol}</span>

        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <span className="text-sm font-medium text-primary">{formatTimeVN(d.created_at)}</span>
          <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{formatDateVN(d.created_at)}</span>
          {d.tx_hash && (
            <a href={`${explorerUrl}/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-0.5">
              Tx: {d.tx_hash.slice(0, 6)}...{d.tx_hash.slice(-4)} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {d.message && <CollapsibleMessage message={d.message} />}
    </div>
  );
}

export function HistoryTab({ walletAddress, userDisplayName, userAvatarUrl, username, userCreatedAt }: Props) {
  const { userId } = useCurrentUser();
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const { donations, loading, error, filter, hasMore, summary, summaryLoading, changeFilter, changeDateRange, fetchDonations, fetchSummary, loadMore } = usePublicDonationHistory(userId ?? undefined, userCreatedAt);

  useEffect(() => {
    if (userId) {
      fetchDonations(1);
      fetchSummary();
    }
  }, [userId]);

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
    { key: 'all', label: 'Tất cả' },
    { key: 'received', label: 'Đã nhận' },
    { key: 'sent', label: 'Đã tặng' },
  ];

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center justify-center gap-1.5">
        <Clock className="w-5 h-5" style={{ color: '#2E7D32' }} />
        <h2 className="text-xl uppercase tracking-wider font-extrabold" style={{ color: '#2E7D32', textShadow: '0 1px 2px rgba(46,125,50,0.2)' }}>
          Lịch sử giao dịch cá nhân
        </h2>
      </div>

      {/* Filters + Date Range row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {filters.map(f => (
          <Button key={f.key} size="sm" variant={filter === f.key ? 'secondary' : 'ghost'} onClick={() => changeFilter(f.key)} className="h-7 text-sm px-3">
            {f.label}
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className={cn("h-8 text-xs gap-1 min-w-[110px]", fromDate && "border-primary text-primary")}>
                <CalendarDays className="w-3.5 h-3.5" />
                {fromDate ? format(fromDate, 'dd/MM/yyyy') : 'Từ ngày'}
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

          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className={cn("h-8 text-xs gap-1 min-w-[110px]", toDate && "border-primary text-primary")}>
                <CalendarDays className="w-3.5 h-3.5" />
                {toDate ? format(toDate, 'dd/MM/yyyy') : 'Đến ngày'}
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

          {(fromDate || toDate) && (
            <Button size="sm" variant="ghost" onClick={clearDateRange} className="h-8 w-8 p-0">
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <SummaryTable summary={summary} activeFilter={filter} />

      {/* Donations list */}
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
            {donations.filter(d => d.type !== 'swap' && d.type !== 'transfer').map(d => (
              <DonationCard key={d.id} d={d} userId={userId!} />
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

      {/* Link to full donations page */}
      <div className="flex justify-center pt-2 pb-4">
        <Button
          variant="outline"
          className="w-full max-w-md gap-2 border-yellow-400 bg-background text-primary hover:bg-yellow-50 hover:text-primary"
          onClick={() => navigate('/donations')}
        >
          Xem Tất Cả Giao Dịch FUN Profile
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
