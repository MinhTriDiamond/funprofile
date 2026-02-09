import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { WalletToken } from '@/lib/tokens';

interface SendConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  token: WalletToken;
  amount: string;
  recipient: string;
  bnbBalance: number;
  isLoading: boolean;
}

export const SendConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  token,
  amount,
  recipient,
  bnbBalance,
  isLoading,
}: SendConfirmModalProps) => {
  const truncated = `${recipient.slice(0, 8)}...${recipient.slice(-6)}`;
  const parsedAmount = parseFloat(amount);
  const lowGas = bnbBalance < 0.002;

  const copyRecipient = () => {
    navigator.clipboard.writeText(recipient);
    toast.success('Đã copy địa chỉ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Xác nhận gửi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Token & Amount */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <img src={token.logo} alt={token.symbol} className="w-10 h-10 rounded-full" />
            <div>
              <p className="text-xl font-bold">{amount} {token.symbol}</p>
              <p className="text-sm text-muted-foreground">{token.name}</p>
            </div>
          </div>

          {/* Recipient */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Người nhận</p>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <code className="text-sm flex-1">{truncated}</code>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyRecipient}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Network */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Network</span>
            <span className="font-medium">BNB Smart Chain</span>
          </div>

          {/* Gas warning */}
          {lowGas && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">
                BNB còn lại rất thấp ({bnbBalance.toFixed(4)} BNB). Có thể không đủ phí gas.
              </p>
            </div>
          )}

          {/* Large amount warning */}
          {parsedAmount > 0 && !isNaN(parsedAmount) && (
            <div className="text-xs text-muted-foreground text-center">
              Vui lòng kiểm tra kỹ thông tin trước khi gửi.
              <br />Giao dịch blockchain không thể hoàn tác.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Đang gửi...' : 'Xác nhận gửi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
