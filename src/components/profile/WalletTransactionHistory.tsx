import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, ArrowDownLeft, ArrowUpRight, ArrowDownUp, ExternalLink, Filter, MessageSquare, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { usePublicDonationHistory, type DonationFilter, type DonationRecord, type DonationSummary } from '@/hooks/usePublicDonationHistory';
import { usePublicWalletBalances } from '@/hooks/usePublicWalletBalances';
import { getBscScanBaseUrl } from '@/lib/chainTokenMapping';
import { WALLET_TOKENS } from '@/lib/tokens';

interface Props {
  userId: string;
  walletAddress?: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  username?: string;
}

const TOKEN_ORDER = ['USDT', 'BNB', 'BTCB', 'FUN', 'CAMLY'];

function formatTimestamp(ts: string) {
  const date = new Date(ts);
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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

function SummaryTable({ summary, walletBalances }: { summary: DonationSummary; walletBalances?: Record<string, number> }) {
  const allTokens = new Set<string>();
  Object.keys(summary.received).forEach(s => allTokens.add(s));
  Object.keys(summary.sent).forEach(s => allTokens.add(s));
  // Also add tokens from wallet balances
  if (walletBalances) {
    Object.keys(walletBalances).forEach(s => {
      if (walletBalances[s] > 0) allTokens.add(s);
    });
  }

  const tokens = TOKEN_ORDER.filter(t => allTokens.has(t));
  const extraTokens = [...allTokens].filter(t => !TOKEN_ORDER.includes(t));
  const orderedTokens = [...tokens, ...extraTokens];

  if (orderedTokens.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Chưa có giao dịch nào</p>;
  }

  return (
    <div className="space-y-3 mb-4">
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-[11px] font-bold w-[60px] px-2 py-1.5 whitespace-nowrap">Token</TableHead>
                <TableHead className="text-[11px] font-bold text-green-600 text-right px-2 py-1.5 whitespace-nowrap">Tổng nhận</TableHead>
                <TableHead className="text-[11px] font-bold text-green-600 text-right px-2 py-1.5 whitespace-nowrap">Lệnh</TableHead>
                <TableHead className="text-[11px] font-bold text-red-600 text-right px-2 py-1.5 whitespace-nowrap">Tổng gửi</TableHead>
                <TableHead className="text-[11px] font-bold text-red-600 text-right px-2 py-1.5 whitespace-nowrap">Lệnh</TableHead>
                <TableHead className="text-[11px] font-bold text-primary text-right px-2 py-1.5 whitespace-nowrap">Số dư ví</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedTokens.map(sym => {
                const recv = summary.received[sym];
                const sent = summary.sent[sym];
                const onChainBalance = walletBalances?.[sym];

                return (
                  <TableRow key={sym}>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <TokenLogo symbol={sym} />
                        <span className="text-[11px] font-bold">{sym}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-2 py-1.5 whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-green-600">{formatAmount(recv?.amount ?? 0)}</span>
                    </TableCell>
                    <TableCell className="text-right px-2 py-1.5 whitespace-nowrap">
                      <span className="text-[11px] text-muted-foreground">{recv?.count ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-right px-2 py-1.5 whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-red-600">{formatAmount(sent?.amount ?? 0)}</span>
                    </TableCell>
                    <TableCell className="text-right px-2 py-1.5 whitespace-nowrap">
                      <span className="text-[11px] text-muted-foreground">{sent?.count ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-right px-2 py-1.5 whitespace-nowrap">
                      {onChainBalance !== undefined ? (
                        <span className="text-[11px] font-bold text-primary">{formatAmount(onChainBalance)}</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground italic px-1">* Số dư ví là số dư on-chain thực tế. Tổng nhận/gửi bao gồm giao dịch tặng/nhận, swap và chuyển ví qua FUN.RICH.</p>

      <div className="flex items-center justify-between bg-muted/50 border border-border rounded-xl px-3 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs text-muted-foreground">Nhận:</span>
            <span className="text-xs font-bold text-green-600">{summary.receivedCount} lệnh</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs text-muted-foreground">Gửi:</span>
            <span className="text-xs font-bold text-red-600">{summary.sentCount} lệnh</span>
          </div>
        </div>
        <span className="text-xs font-bold text-foreground">Tổng: {summary.totalCount} GD</span>
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
  const explorerUrl = getBscScanBaseUrl(d.chain_id);
  const isIn = d.direction === 'in';

  return (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <div className="flex justify-between items-center">
        <Badge className={isIn ? 'bg-blue-600 hover:bg-blue-700 text-white text-xs' : 'bg-orange-600 hover:bg-orange-700 text-white text-xs'}>
          <ArrowRightLeft className="w-3 h-3 mr-1" />
          {isIn ? 'Chuyển vào' : 'Chuyển ra'}
        </Badge>
        <StatusBadge status={d.status} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <TokenLogo symbol={d.token_symbol} />
          <span className="font-bold">{Number(d.amount).toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {d.token_symbol}</span>
        </div>
      </div>

      {d.counterparty_address && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{isIn ? 'Từ:' : 'Đến:'}</span>
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
        <span className="text-muted-foreground">{formatTimestamp(d.created_at)}</span>
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
  const explorerUrl = getBscScanBaseUrl(d.chain_id);
  return (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <div className="flex justify-between items-center">
        <Badge className="bg-violet-600 hover:bg-violet-700 text-white text-xs">
          <ArrowDownUp className="w-3 h-3 mr-1" />
          Swap
        </Badge>
        <StatusBadge status={d.status} />
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
        <span className="text-muted-foreground">{formatTimestamp(d.created_at)}</span>
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

  const senderName = d.sender_display_name || d.sender_username || 
    (d.sender_address ? shortenAddress(d.sender_address) : 'Ví ngoài');
  const senderAvatar = d.sender_avatar_url;

  return (
    <div className="border border-border rounded-xl p-4 space-y-2.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={isSent ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30 text-sm' : 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30 text-sm'}>
            {isSent ? <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> : <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />}
            {isSent ? 'Đã tặng' : 'Đã nhận'}
          </Badge>
          {isExternal && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0">
              Ví ngoài
            </Badge>
          )}
        </div>
        <StatusBadge status={d.status} />
      </div>

      <div className="flex items-center gap-2 text-base flex-wrap">
        {isExternal && !d.sender_id ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">🌐</AvatarFallback>
            </Avatar>
            {d.sender_address ? (
              <a
                href={`${explorerUrl}/address/${d.sender_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                onClick={e => e.stopPropagation()}
              >
                {shortenAddress(d.sender_address)} <ExternalLink className="w-3 h-3" />
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
        <span className="text-muted-foreground">→</span>
        <UserAvatar
          username={d.recipient_username}
          displayName={d.recipient_display_name}
          avatarUrl={d.recipient_avatar_url}
          onClick={() => d.recipient_username && navigate(`/${d.recipient_username}`)}
        />
        <span className="font-bold whitespace-nowrap ml-auto">{Number(d.amount).toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {d.token_symbol}</span>
        <span className="text-sm text-muted-foreground whitespace-nowrap">{formatTimestamp(d.created_at)}</span>
        {d.tx_hash && (
          <a href={`${explorerUrl}/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 whitespace-nowrap">
            Tx: {d.tx_hash.slice(0, 10)}...{d.tx_hash.slice(-6)} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {d.message && <CollapsibleMessage message={d.message} />}
    </div>
  );
}

export function WalletTransactionHistory({ userId, walletAddress, userDisplayName, userAvatarUrl, username }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { donations, loading, error, filter, hasMore, summary, summaryLoading, changeFilter, fetchDonations, fetchSummary, loadMore } = usePublicDonationHistory(userId);
  const { balances: walletBalances } = usePublicWalletBalances(open ? walletAddress : undefined);

  useEffect(() => {
    if (open && userId) {
      fetchDonations(1);
      fetchSummary();
    }
  }, [open, userId]);

  const filters: { key: DonationFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'received', label: 'Đã nhận' },
    { key: 'sent', label: 'Đã tặng' },
  ];

  const displayName = userDisplayName || username || '?';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-semibold px-4 h-10 border-primary/30 text-primary hover:bg-primary/10">
          <Clock className="w-4 h-4 mr-2" />
          Lịch sử GD
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[95vw] sm:max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
        {/* Fixed header */}
        <div className="flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-xl uppercase tracking-wider font-extrabold w-full" style={{ color: '#2E7D32', textShadow: '0 1px 2px rgba(46,125,50,0.2)' }}>
              <Clock className="w-5 h-5" style={{ color: '#2E7D32' }} />
              Lịch sử giao dịch cá nhân
            </DialogTitle>
            <DialogDescription className="sr-only">Xem lịch sử chuyển và nhận tiền cá nhân</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-1.5 py-3 border-b border-border">
            <Avatar className="w-12 h-12">
              {userAvatarUrl && <AvatarImage src={userAvatarUrl} />}
              <AvatarFallback className="text-base bg-primary/10 text-primary font-bold">{displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-base font-bold text-foreground">{displayName}</span>
          </div>

          <div className="flex items-center gap-1 py-3 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {filters.map(f => (
              <Button key={f.key} size="sm" variant={filter === f.key ? 'secondary' : 'ghost'} onClick={() => changeFilter(f.key)} className="h-8 text-sm">
                {f.label}
              </Button>
            ))}
          </div>
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
                {donations.filter(d => d.type !== 'swap' && d.type !== 'transfer').map(d => (
                  <DonationCard key={d.id} d={d} userId={userId} />
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
