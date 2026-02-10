import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Copy, ExternalLink, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import type { WalletToken } from '@/lib/tokens';
import type { TxStep } from '@/hooks/useSendToken';
import { useEffect } from 'react';

interface SendConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  token: WalletToken;
  amount: string;
  recipient: string;
  bnbBalance: number;
  isLoading: boolean;
  txStep: TxStep;
  txHash: string | null;
  onRecheck: () => void;
}

const STEP_CONFIG: Record<string, { label: string; progress: number }> = {
  idle: { label: '', progress: 0 },
  signing: { label: 'Vui lòng xác nhận trong ví...', progress: 15 },
  broadcasted: { label: 'Giao dịch đã được gửi lên mạng', progress: 35 },
  confirming: { label: 'Đang chờ xác nhận từ blockchain...', progress: 60 },
  finalizing: { label: 'Đang ghi nhận vào hệ thống...', progress: 85 },
  success: { label: 'Hoàn tất!', progress: 100 },
  timeout: { label: 'Chưa nhận được xác nhận kịp thời', progress: 70 },
};

export const SendConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  token,
  amount,
  recipient,
  bnbBalance,
  isLoading,
  txStep,
  txHash,
  onRecheck,
}: SendConfirmModalProps) => {
  const truncated = `${recipient.slice(0, 8)}...${recipient.slice(-6)}`;
  const parsedAmount = parseFloat(amount);
  const lowGas = bnbBalance < 0.002;
  const isInProgress = ['signing', 'broadcasted', 'confirming', 'finalizing'].includes(txStep);
  const stepInfo = STEP_CONFIG[txStep] || STEP_CONFIG.idle;
  const scanUrl = txHash ? getBscScanTxUrl(txHash, token.symbol) : null;

  // Auto-đóng sau 3 giây khi thành công
  useEffect(() => {
    if (txStep === 'success') {
      const timer = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(timer);
    }
  }, [txStep, onClose]);

  const copyRecipient = () => {
    navigator.clipboard.writeText(recipient);
    toast.success('Đã copy địa chỉ');
  };

  // Không cho đóng modal khi đang xử lý (trừ timeout)
  const handleOpenChange = (open: boolean) => {
    if (!open && !isInProgress) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {txStep === 'success' ? '✨ Giao dịch thành công' : txStep === 'timeout' ? 'Cần kiểm tra lại' : 'Xác nhận gửi'}
          </DialogTitle>
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

          {/* Progress bar khi đang xử lý */}
          {(isInProgress || txStep === 'success' || txStep === 'timeout') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {txStep === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                ) : txStep === 'timeout' ? (
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                )}
                <p className="text-sm font-medium">{stepInfo.label}</p>
              </div>
              <Progress value={stepInfo.progress} className="h-2" />
            </div>
          )}

          {/* BscScan link khi có txHash */}
          {scanUrl && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => window.open(scanUrl, '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Xem trên BscScan
            </Button>
          )}

          {/* Gas warning — chỉ hiện trước khi gửi */}
          {txStep === 'idle' && lowGas && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">
                BNB còn lại rất thấp ({bnbBalance.toFixed(4)} BNB). Có thể không đủ phí gas.
              </p>
            </div>
          )}

          {/* Nhắc nhở — chỉ hiện trước khi gửi */}
          {txStep === 'idle' && parsedAmount > 0 && !isNaN(parsedAmount) && (
            <div className="text-xs text-muted-foreground text-center">
              Vui lòng kiểm tra kỹ thông tin trước khi gửi.
              <br />Giao dịch blockchain không thể hoàn tác.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {txStep === 'idle' && (
            <>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Hủy
              </Button>
              <Button onClick={onConfirm} disabled={isLoading}>
                {isLoading ? 'Đang gửi...' : 'Xác nhận gửi'}
              </Button>
            </>
          )}

          {txStep === 'timeout' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
              <Button onClick={onRecheck} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Kiểm tra lại
              </Button>
            </>
          )}

          {txStep === 'success' && (
            <Button variant="outline" onClick={onClose} className="w-full">
              Đóng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
