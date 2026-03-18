import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, ArrowDownLeft, ArrowUpRight, ExternalLink, Filter } from 'lucide-react';
import { useWalletHistory, type TxFilter, type WalletTx } from '@/hooks/useWalletHistory';
import { getBscScanBaseUrl } from '@/lib/chainTokenMapping';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  walletAddress: string;
}

function shortenAddr(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
}

function formatTimestamp(ts: string) {
  // Support both ISO date strings (Moralis) and Unix timestamps (BscScan)
  const date = ts.includes('T') || ts.includes('-') ? new Date(ts) : new Date(Number(ts) * 1000);
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatValue(value: string, decimals = '18') {
  const d = Number(decimals) || 18;
  return (Number(value) / Math.pow(10, d)).toLocaleString('vi-VN', { maximumFractionDigits: 6 });
}

function TxTypeBadge({ tx, walletAddress }: { tx: WalletTx; walletAddress: string }) {
  const isReceive = tx.to.toLowerCase() === walletAddress.toLowerCase();
  return (
    <Badge variant="outline" className={isReceive ? 'border-green-500 text-green-600 bg-green-50' : 'border-red-500 text-red-600 bg-red-50'}>
      {isReceive ? <ArrowDownLeft className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
      {isReceive ? 'Nhận' : 'Gửi'}
    </Badge>
  );
}

function StatusBadge({ tx }: { tx: WalletTx }) {
  const failed = tx.isError === '1' || tx.txreceipt_status === '0';
  return (
    <Badge variant={failed ? 'destructive' : 'default'} className={failed ? '' : 'bg-green-600 hover:bg-green-700'}>
      {failed ? 'Lỗi' : 'Thành công'}
    </Badge>
  );
}

function SummaryCards({ totalReceived, totalSent, count }: { totalReceived: number; totalSent: number; count: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
        <p className="text-xs text-green-600 font-medium">Tổng nhận</p>
        <p className="text-sm font-bold text-green-700">{totalReceived.toLocaleString('vi-VN', { maximumFractionDigits: 4 })}</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
        <p className="text-xs text-red-600 font-medium">Tổng gửi</p>
        <p className="text-sm font-bold text-red-700">{totalSent.toLocaleString('vi-VN', { maximumFractionDigits: 4 })}</p>
      </div>
      <div className="bg-muted border border-border rounded-xl p-3 text-center">
        <p className="text-xs text-muted-foreground font-medium">Giao dịch</p>
        <p className="text-sm font-bold text-foreground">{count}</p>
      </div>
    </div>
  );
}

// Mobile card view
function TxCard({ tx, walletAddress }: { tx: WalletTx; walletAddress: string }) {
  const explorerUrl = getBscScanBaseUrl(tx._chainId);
  const gasWei = BigInt(tx.gasUsed || '0') * BigInt(tx.gasPrice || '0');
  const gasBnb = Number(gasWei) / 1e18;

  return (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <div className="flex justify-between items-center">
        <TxTypeBadge tx={tx} walletAddress={walletAddress} />
        <StatusBadge tx={tx} />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{formatTimestamp(tx.timeStamp)}</span>
        <span className="font-bold">{formatValue(tx.value, tx.tokenDecimal)} {tx.tokenSymbol || 'BNB'}</span>
      </div>
      <div className="text-xs space-y-1 text-muted-foreground">
        <div>Từ: <a href={`${explorerUrl}/address/${tx.from}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{shortenAddr(tx.from)}</a></div>
        <div>Đến: <a href={`${explorerUrl}/address/${tx.to}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{shortenAddr(tx.to)}</a></div>
        {gasBnb > 0 && <div>Gas: {gasBnb.toFixed(6)} BNB</div>}
      </div>
      <a href={`${explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
        Tx: {shortenAddr(tx.hash)} <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

export function WalletTransactionHistory({ walletAddress }: Props) {
  const [open, setOpen] = useState(false);
  const { loading, error, filter, setFilter, action, changeAction, fetchHistory, loadMore, hasMore, getFilteredTxs, getSummary } = useWalletHistory(walletAddress);
  const { t } = useLanguage();

  useEffect(() => {
    if (open && walletAddress) {
      fetchHistory(1);
    }
  }, [open, walletAddress]);

  const txs = getFilteredTxs();
  const summary = getSummary();
  const filters: { key: TxFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'receive', label: 'Nhận' },
    { key: 'send', label: 'Gửi' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-semibold px-4 h-10 border-primary/30 text-primary hover:bg-primary/10">
          <Clock className="w-4 h-4 mr-2" />
          Lịch sử GD
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Lịch sử giao dịch
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{walletAddress}</p>
          <DialogDescription className="sr-only">Xem lịch sử giao dịch trên blockchain</DialogDescription>

        <SummaryCards {...summary} />

        {/* Action Toggle */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Button size="sm" variant={action === 'txlist' ? 'default' : 'outline'} onClick={() => changeAction('txlist')}>
            BNB / Native
          </Button>
          <Button size="sm" variant={action === 'tokentx' ? 'default' : 'outline'} onClick={() => changeAction('tokentx')}>
            Token BEP-20
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {filters.map(f => (
              <Button key={f.key} size="sm" variant={filter === f.key ? 'secondary' : 'ghost'} onClick={() => setFilter(f.key)} className="h-7 text-xs">
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        {loading && txs.length === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : txs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Không có giao dịch nào</p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Thời gian</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Từ</TableHead>
                    <TableHead>Đến</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tx Hash</TableHead>
                    <TableHead className="text-right">Gas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.map(tx => {
                    const explorerUrl = getBscScanBaseUrl(tx._chainId);
                    const gasWei = BigInt(tx.gasUsed || '0') * BigInt(tx.gasPrice || '0');
                    const gasBnb = Number(gasWei) / 1e18;
                    return (
                      <TableRow key={`${tx.hash}-${tx._network}`}>
                        <TableCell className="text-xs whitespace-nowrap">{formatTimestamp(tx.timeStamp)}</TableCell>
                        <TableCell><TxTypeBadge tx={tx} walletAddress={walletAddress} /></TableCell>
                        <TableCell className="font-medium text-sm whitespace-nowrap">{formatValue(tx.value, tx.tokenDecimal)} {tx.tokenSymbol || 'BNB'}</TableCell>
                        <TableCell>
                          <a href={`${explorerUrl}/address/${tx.from}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-mono">{shortenAddr(tx.from)}</a>
                        </TableCell>
                        <TableCell>
                          <a href={`${explorerUrl}/address/${tx.to}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-mono">{shortenAddr(tx.to)}</a>
                        </TableCell>
                        <TableCell><StatusBadge tx={tx} /></TableCell>
                        <TableCell>
                          <a href={`${explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-mono flex items-center gap-1">
                            {shortenAddr(tx.hash)} <ExternalLink className="w-3 h-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{gasBnb > 0 ? gasBnb.toFixed(6) : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {txs.map(tx => (
                <TxCard key={`${tx.hash}-${tx._network}`} tx={tx} walletAddress={walletAddress} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? 'Đang tải...' : 'Tải thêm'}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
