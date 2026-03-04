/**
 * GiftConfirmStep — Extracted from UnifiedGiftSendDialog
 * Renders the confirmation view (Step 2): sender/recipient summary,
 * amount, progress bar, multi-send progress, and action buttons.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Copy, ArrowLeft, Shield, Users, Loader2, CheckCircle2, AlertTriangle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { TokenOption } from '@/components/donations/TokenSelector';
import type { ResolvedRecipient, MultiSendResult } from './types';
import { TxStep } from '@/hooks/useSendToken';

const STEP_CONFIG: Record<string, { label: string; progress: number }> = {
  idle: { label: '', progress: 0 },
  signing: { label: 'Vui lòng xác nhận trong ví...', progress: 15 },
  broadcasted: { label: 'Giao dịch đã được gửi lên mạng', progress: 35 },
  confirming: { label: 'Đang chờ xác nhận từ blockchain...', progress: 60 },
  finalizing: { label: 'Đang ghi nhận vào hệ thống...', progress: 85 },
  success: { label: 'Hoàn tất!', progress: 100 },
  timeout: { label: 'Chưa nhận được xác nhận kịp thời', progress: 70 },
};

interface SenderInfo {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface GiftConfirmStepProps {
  senderProfile: SenderInfo | null;
  address: string | undefined;
  recipientsWithWallet: ResolvedRecipient[];
  isMultiMode: boolean;
  amount: string;
  totalAmount: number;
  totalEstimatedUsd: number;
  selectedToken: TokenOption;
  customMessage: string;
  // TX state
  txStep: TxStep;
  txHash: string | undefined;
  isPending: boolean;
  isMultiSending: boolean;
  currentSendingIndex: number;
  multiSendProgress: { current: number; total: number; results: MultiSendResult[] } | null;
  scanUrl: string | null;
  isSendDisabled: boolean;
  // Actions
  onSend: () => void;
  onGoBack: () => void;
  onClose: () => void;
  onRecheckReceipt: () => void;
}

export function GiftConfirmStep({
  senderProfile,
  address,
  recipientsWithWallet,
  isMultiMode,
  amount,
  totalAmount,
  totalEstimatedUsd,
  selectedToken,
  customMessage,
  txStep,
  txHash,
  isPending,
  isMultiSending,
  currentSendingIndex,
  multiSendProgress,
  scanUrl,
  isSendDisabled,
  onSend,
  onGoBack,
  onClose,
  onRecheckReceipt,
}: GiftConfirmStepProps) {
  const isInProgress = ['signing', 'broadcasted', 'confirming', 'finalizing'].includes(txStep);
  const stepInfo = STEP_CONFIG[txStep] || STEP_CONFIG.idle;

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success('Đã copy địa chỉ ví');
  };

  return (
    <div className="space-y-4 py-2">
      <div className="bg-muted/30 rounded-xl p-4 space-y-4 border">
        {/* Sender */}
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-primary/30">
            <AvatarImage src={senderProfile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/20 text-primary">{senderProfile?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{senderProfile?.display_name || senderProfile?.username}</p>
            <p className="text-xs text-muted-foreground">@{senderProfile?.username}</p>
            {address && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground font-mono">{address.slice(0, 8)}...{address.slice(-6)}</span>
                <button type="button" onClick={() => handleCopyAddress(address)} className="p-0.5 hover:bg-muted rounded"><Copy className="w-3 h-3 text-muted-foreground" /></button>
              </div>
            )}
          </div>
        </div>

        {/* Arrow + Amount */}
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="h-px flex-1 bg-border" />
          <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-full bg-gradient-to-r from-gold/20 to-amber-500/20 border border-gold/50">
            <span className="text-lg font-bold text-amber-800">
              {isMultiMode
                ? `${Number(amount).toLocaleString()} × ${recipientsWithWallet.length} = ${totalAmount.toLocaleString()} ${selectedToken.symbol}`
                : `${Number(amount).toLocaleString()} ${selectedToken.symbol}`
              }
            </span>
            {isMultiMode && totalEstimatedUsd > 0 && (
              <span className="text-xs text-amber-600">≈ ${totalEstimatedUsd.toFixed(2)} USD tổng</span>
            )}
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Recipients */}
        {isMultiMode ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium">{recipientsWithWallet.length} người nhận — mỗi người {Number(amount).toLocaleString()} {selectedToken.symbol}</span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {recipientsWithWallet.map((recipient, idx) => {
                const result = multiSendProgress?.results.find(r => r.recipient.id === recipient.id);
                const isSendingNow = currentSendingIndex === idx && isMultiSending && !result;
                return (
                  <div key={recipient.id} className={`flex items-center gap-2.5 p-2 rounded-lg border ${
                    result?.success ? 'bg-emerald-50 border-emerald-200' :
                    result && !result.success ? 'bg-destructive/5 border-destructive/20' :
                    isSendingNow ? 'bg-primary/5 border-primary/30' :
                    'bg-muted/30'
                  }`}>
                    <Avatar className="w-8 h-8 border border-gold/20">
                      <AvatarImage src={recipient.avatarUrl || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">{recipient.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{recipient.displayName || recipient.username}</p>
                      <p className="text-[10px] text-muted-foreground truncate">@{recipient.username}</p>
                      {result?.txHash && <p className="text-[10px] text-emerald-600 font-mono truncate">{result.txHash.slice(0, 10)}...</p>}
                      {result?.error && <p className="text-[10px] text-destructive truncate">{result.error}</p>}
                    </div>
                    {result?.success && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {result && !result.success && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                    {isSendingNow && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-gold/30">
              <AvatarImage src={recipientsWithWallet[0]?.avatarUrl || ''} />
              <AvatarFallback className="bg-primary/20 text-primary">{recipientsWithWallet[0]?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{recipientsWithWallet[0]?.displayName || recipientsWithWallet[0]?.username}</p>
              <p className="text-xs text-muted-foreground">@{recipientsWithWallet[0]?.username}</p>
              {recipientsWithWallet[0]?.walletAddress && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground font-mono">{recipientsWithWallet[0].walletAddress.slice(0, 8)}...{recipientsWithWallet[0].walletAddress.slice(-6)}</span>
                  <button type="button" onClick={() => handleCopyAddress(recipientsWithWallet[0].walletAddress!)} className="p-0.5 hover:bg-muted rounded"><Copy className="w-3 h-3 text-muted-foreground" /></button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        {customMessage && (
          <div className="bg-white/80 rounded-lg p-3 border">
            <p className="text-sm text-muted-foreground mb-1">Lời nhắn:</p>
            <p className="text-sm italic">"{customMessage}"</p>
          </div>
        )}

        {/* Chain info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Chain: BSC (BNB Smart Chain)</span>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700 font-medium">
          {isMultiMode
            ? `Sẽ gửi ${recipientsWithWallet.length} giao dịch riêng biệt. Mỗi giao dịch cần xác nhận trong ví. Không thể hoàn tác.`
            : 'Giao dịch blockchain không thể hoàn tác. Vui lòng kiểm tra kỹ trước khi xác nhận.'
          }
        </p>
      </div>

      {/* Multi-send progress */}
      {multiSendProgress && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isMultiSending
              ? <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              : <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            }
            <p className="text-sm font-medium">
              {isMultiSending
                ? `Đang gửi ${multiSendProgress.current}/${multiSendProgress.total}...`
                : `Hoàn tất ${multiSendProgress.results.filter(r => r.success).length}/${multiSendProgress.total} giao dịch`
              }
            </p>
          </div>
          <Progress value={(multiSendProgress.current / multiSendProgress.total) * 100} className="h-2" />
          {multiSendProgress.results.length > 0 && (
            <p className="text-xs text-muted-foreground">
              ✅ {multiSendProgress.results.filter(r => r.success).length} thành công
              {multiSendProgress.results.some(r => !r.success) && ` · ❌ ${multiSendProgress.results.filter(r => !r.success).length} thất bại`}
            </p>
          )}
        </div>
      )}

      {/* Single send TX Progress */}
      {!isMultiMode && (isInProgress || txStep === 'success' || txStep === 'timeout') && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {txStep === 'success' ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> :
             txStep === 'timeout' ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0" /> :
             <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
            <p className="text-sm font-medium">{stepInfo.label}</p>
          </div>
          <Progress value={stepInfo.progress} className="h-2" />
        </div>
      )}

      {scanUrl && !isMultiMode && (
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => window.open(scanUrl, '_blank')}>
          <ExternalLink className="w-3.5 h-3.5" />Xem trên BscScan
        </Button>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {txStep === 'timeout' && !isMultiMode ? (
          <>
            <Button variant="outline" onClick={onClose} className="flex-1">Đóng</Button>
            <Button onClick={onRecheckReceipt} className="flex-1 gap-2"><RefreshCw className="w-3.5 h-3.5" />Kiểm tra lại</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onGoBack} className="flex-1 gap-2" disabled={isInProgress || isMultiSending}>
              <ArrowLeft className="w-4 h-4" />Quay lại
            </Button>
            <Button onClick={onSend} disabled={isSendDisabled} className="flex-1 bg-gradient-to-r from-gold to-amber-500 hover:from-gold/90 hover:to-amber-500/90 text-primary-foreground">
              {isPending || isInProgress || isMultiSending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang xử lý...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />
                  {isMultiMode ? `Xác nhận & Tặng ${recipientsWithWallet.length} người` : 'Xác nhận & Tặng'}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
