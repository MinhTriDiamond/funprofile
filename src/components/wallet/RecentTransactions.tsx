import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import { useTransactionHistory, type Transaction } from '@/hooks/useTransactionHistory';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'confirmed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmed</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
    default:
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
  }
};

const TxItem = ({ tx }: { tx: Transaction }) => {
  const truncatedTo = `${tx.to_address.slice(0, 6)}...${tx.to_address.slice(-4)}`;
  const scanUrl = getBscScanTxUrl(tx.tx_hash, tx.token_symbol);
  const timeAgo = formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: vi });

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {tx.amount} {tx.token_symbol}
          </span>
          <span className="text-muted-foreground text-sm">→ {truncatedTo}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          <StatusBadge status={tx.status} />
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={() => window.open(scanUrl, '_blank')}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const RecentTransactions = () => {
  const { transactions, isLoading, refreshAll } = useTransactionHistory();

  if (transactions.length === 0 && !isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshAll}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Đang tải...</p>
        ) : (
          <div className="divide-y">
            {transactions.map(tx => (
              <TxItem key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
