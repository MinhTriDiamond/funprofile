import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBtcBalance } from '@/hooks/useBtcBalance';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { Copy, ExternalLink, Send } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/clipboard';
import { useLanguage } from '@/i18n/LanguageContext';
import btcLogo from '@/assets/tokens/btc-logo.png';

interface BtcSendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  btcAddress: string | null;
}

export const BtcSendDialog = ({ isOpen, onClose, btcAddress }: BtcSendDialogProps) => {
  const { t } = useLanguage();
  const { balance, isLoading } = useBtcBalance(btcAddress);
  const { prices } = useTokenBalances();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');

  const btcPrice = prices?.BTC?.usd ?? 100000;
  const parsedAmount = parseFloat(amount) || 0;
  const usdValue = parsedAmount * btcPrice;
  const hasEnough = parsedAmount <= balance && parsedAmount > 0;

  const bip21Uri = useMemo(() => {
    if (!recipientAddress || !parsedAmount) return '';
    return `bitcoin:${recipientAddress}?amount=${parsedAmount}`;
  }, [recipientAddress, parsedAmount]);

  const handleOpenWallet = () => {
    if (!bip21Uri) return;
    window.location.href = bip21Uri;
  };

  const handleCopyInfo = async () => {
    const text = `Địa chỉ: ${recipientAddress}\nSố lượng: ${amount} BTC`;
    const ok = await copyToClipboard(text);
    if (ok) toast.success('Đã sao chép thông tin giao dịch');
  };

  const handleMax = () => {
    if (balance > 0) setAmount(balance.toFixed(8));
  };

  const handleReset = () => {
    setRecipientAddress('');
    setAmount('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); handleReset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={btcLogo} alt="BTC" className="w-12 h-12 rounded-full" />
            Gửi BTC
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Balance */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Số dư khả dụng</p>
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">
                {isLoading ? '...' : `${balance.toFixed(8)} BTC`}
              </span>
              <span className="text-sm text-muted-foreground">
                ≈ ${(balance * btcPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="text-sm font-medium mb-1 block">Địa chỉ người nhận</label>
            <Input
              placeholder="bc1q... hoặc 1... hoặc 3..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value.trim())}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium mb-1 block">Số lượng BTC</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.00000001"
                min="0"
              />
              <button
                onClick={handleMax}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                MAX
              </button>
            </div>
            {parsedAmount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ≈ ${usdValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
            )}
            {parsedAmount > 0 && !hasEnough && (
              <p className="text-xs text-red-500 mt-1">Số dư không đủ</p>
            )}
          </div>

          {/* Info notice */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p>⚠️ Giao dịch BTC sẽ được mở qua ví Bitcoin trên thiết bị của bạn (Trust Wallet, Bitget, v.v.). Ứng dụng không thể ký giao dịch BTC trực tiếp.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleOpenWallet}
              disabled={!recipientAddress || !hasEnough}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Mở ví BTC để gửi
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyInfo}
              disabled={!recipientAddress || !parsedAmount}
              title="Sao chép thông tin"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
