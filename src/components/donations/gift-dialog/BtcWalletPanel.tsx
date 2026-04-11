/**
 * BtcWalletPanel — Panel hướng dẫn gửi BTC
 * Hiện QR code + nút copy + nút thử mở ví
 */

import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

interface BtcWalletPanelProps {
  bip21Url: string;
  recipientAddress: string;
  amount: string;
  pollingStatus: 'idle' | 'polling' | 'found' | 'timeout';
  txid: string | null;
  onMarkManualSend: () => void;
  onCancel: () => void;
}

export function BtcWalletPanel({
  bip21Url,
  recipientAddress,
  amount,
  pollingStatus,
  txid,
  onMarkManualSend,
  onCancel,
}: BtcWalletPanelProps) {
  const { t } = useLanguage();

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const handleTryOpenWallet = () => {
    window.location.href = bip21Url;
  };

  if (pollingStatus === 'found') {
    return (
      <div className="text-center space-y-3 py-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <p className="text-sm font-semibold text-emerald-700">Đã phát hiện giao dịch BTC!</p>
        {txid && !txid.startsWith('btc-manual') && (
          <a
            href={`https://mempool.space/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-primary hover:underline flex items-center justify-center gap-1"
          >
            {txid.slice(0, 16)}... <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {/* QR Code — responsive size */}
      <div className="flex justify-center">
        <div className="p-2 sm:p-3 bg-white rounded-xl border-2 border-amber-200 shadow-sm">
          <QRCodeSVG value={bip21Url} size={180} level="H" includeMargin={true} className="w-[160px] h-[160px] sm:w-[180px] sm:h-[180px]" />
        </div>
      </div>

      <p className="text-xs text-center text-amber-700 font-medium">
        Quét QR hoặc nhấn nút mở ví bên dưới
      </p>

      {/* Address + Amount copy */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground mb-0.5">Địa chỉ nhận</p>
            <p className="text-xs font-mono break-all">{recipientAddress}</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => handleCopy(recipientAddress, 'địa chỉ')}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground mb-0.5">Số lượng</p>
            <p className="text-xs font-mono">{amount} BTC</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => handleCopy(amount, 'số lượng')}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleTryOpenWallet}>
          <ExternalLink className="w-3.5 h-3.5" />
          Mở ví BTC
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => handleCopy(bip21Url, 'BIP21 URL')}>
          <Copy className="w-3.5 h-3.5" />
          Copy link
        </Button>
      </div>

      {/* Wallet compatibility note - mobile only */}
      <div className="sm:hidden space-y-1 p-2 rounded-lg bg-muted/50 border text-[10px]">
        <p className="text-emerald-700">✅ Trust Wallet, Bitget Wallet: Hỗ trợ BTC native</p>
        <p className="text-amber-700">⚠️ MetaMask mobile: Dùng BTCB (mạng BSC) để giao dịch</p>
      </div>

      {/* Polling status */}
      <div className="flex items-center justify-center gap-2 py-1">
        {pollingStatus === 'polling' && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 w-full justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span className="text-xs text-amber-700 font-medium">Đang chờ giao dịch trên blockchain...</span>
          </div>
        )}
        {pollingStatus === 'timeout' && (
          <div className="text-center space-y-2 w-full">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-amber-700">Chưa phát hiện giao dịch sau 10 phút</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
                Hủy
              </Button>
              <Button size="sm" className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white" onClick={onMarkManualSend}>
                Tôi đã gửi
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
