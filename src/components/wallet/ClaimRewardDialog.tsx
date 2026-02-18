import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Wallet, ExternalLink, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useClaimReward } from '@/hooks/useClaimReward';
import { DonationCelebration } from '@/components/donations/DonationCelebration';
import { RichTextOverlay } from '@/components/donations/RichTextOverlay';
import { playCelebrationMusicLoop } from '@/lib/celebrationSounds';
import funEcosystemLogo from '@/assets/tokens/fun-ecosystem-logo.gif';

const MINIMUM_CLAIM = 200000;
const DAILY_CLAIM_CAP = 500000;

interface ClaimRewardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimableAmount: number;
  externalWallet: string | null;
  camlyPrice: number;
  dailyClaimed: number;
  onSuccess: () => void;
}

type ClaimStep = 'input' | 'confirming' | 'success' | 'error';

export const ClaimRewardDialog = ({
  open,
  onOpenChange,
  claimableAmount,
  externalWallet,
  camlyPrice,
  dailyClaimed,
  onSuccess,
}: ClaimRewardDialogProps) => {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<ClaimStep>('input');
  const [showCelebration, setShowCelebration] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { claimReward, isLoading, error, result, reset } = useClaimReward();

  useEffect(() => {
    if (open) {
      setAmount('');
      setStep('input');
      setShowCelebration(false);
      reset();
    }
  }, [open, reset]);

  // Cleanup audio on unmount or dialog close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const formatNumber = (num: number) => num.toLocaleString('vi-VN');
  const formatUsd = (num: number) => `$${(num * camlyPrice).toFixed(2)}`;

  const dailyRemaining = Math.max(0, DAILY_CLAIM_CAP - dailyClaimed);
  const maxClaimable = Math.min(claimableAmount, dailyRemaining);

  const handleMaxClick = () => setAmount(maxClaimable.toString());

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(/[^0-9]/g, ''));
  };

  const isValidAmount = () => {
    const numAmount = Number(amount);
    return numAmount >= MINIMUM_CLAIM && numAmount <= maxClaimable;
  };

  const handleClaim = async () => {
    if (!externalWallet) return;
    setStep('confirming');
    const claimResult = await claimReward(Number(amount), externalWallet);
    if (claimResult) {
      setStep('success');
      setShowCelebration(true);
      audioRef.current = playCelebrationMusicLoop('rich-3');
      onSuccess();
    } else {
      setStep('error');
    }
  };

  const handleClose = () => {
    setShowCelebration(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onOpenChange(false);
  };

  const renderInputStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <Gift className="w-6 h-6 text-yellow-500" />
          Claim CAMLY Rewards
        </DialogTitle>
        <DialogDescription>
          Chuyển phần thưởng CAMLY vào ví của bạn
        </DialogDescription>
      </DialogHeader>

      {/* ⚠️ MAINTENANCE BANNER — xóa block này khi mở lại hệ thống */}
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 my-4 text-center">
        <div className="text-3xl mb-2">🔧</div>
        <p className="font-bold text-red-700 text-base mb-1">Hệ thống tạm dừng bảo trì</p>
        <p className="text-red-600 text-sm">
          Chức năng rút thưởng CAMLY đang tạm dừng để nâng cấp hệ thống.
          Vui lòng quay lại sau. Xin lỗi vì sự bất tiện này! 🙏
        </p>
      </div>

      <Button onClick={() => onOpenChange(false)} className="w-full" variant="outline">
        Đóng
      </Button>
    </>
  );

  const _renderInputStep_DISABLED = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <Gift className="w-6 h-6 text-yellow-500" />
          Claim CAMLY Rewards
        </DialogTitle>
        <DialogDescription>
          Chuyển phần thưởng CAMLY vào ví của bạn
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Available Balance */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-700 mb-1">Số dư khả dụng</p>
          <p className="text-2xl font-bold text-yellow-800">
            {formatNumber(claimableAmount)} CAMLY
          </p>
          <p className="text-sm text-yellow-600">~{formatUsd(claimableAmount)}</p>
        </div>

        {/* Daily Claim Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-blue-700">Đã claim hôm nay</p>
            <p className="text-sm font-semibold text-blue-800">{formatNumber(dailyClaimed)} / {formatNumber(DAILY_CLAIM_CAP)}</p>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all" 
              style={{ width: `${Math.min(100, (dailyClaimed / DAILY_CLAIM_CAP) * 100)}%` }} 
            />
          </div>
          <p className="text-sm text-blue-600">
            Còn được claim hôm nay: <span className="font-bold">{formatNumber(dailyRemaining)} CAMLY</span>
          </p>
          {dailyRemaining <= 0 && (
            <p className="text-sm text-red-500 font-medium mt-1">⚠️ Đã hết giới hạn claim hôm nay, vui lòng quay lại ngày mai</p>
          )}
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Số lượng claim</Label>
          <div className="relative">
            <Input
              id="amount"
              type="text"
              placeholder="Nhập số lượng CAMLY"
              value={amount ? formatNumber(Number(amount)) : ''}
              onChange={(e) => handleAmountChange(e.target.value.replace(/\./g, ''))}
              className="pr-16 text-lg font-medium"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMaxClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80"
            >
              MAX
            </Button>
          </div>
          {amount && Number(amount) > 0 && (
            <p className="text-sm text-muted-foreground">~{formatUsd(Number(amount))}</p>
          )}
          {amount && Number(amount) < 1 && (
            <p className="text-sm text-red-500">Số lượng phải lớn hơn 0</p>
          )}
          {amount && Number(amount) > maxClaimable && (
            <p className="text-sm text-red-500">
              {Number(amount) > claimableAmount ? 'Vượt quá số dư khả dụng' : 'Vượt quá giới hạn claim hôm nay'}
            </p>
          )}
        </div>

        {/* Wallet Info */}
        {externalWallet ? (
          <div className="space-y-2">
            <Label>Ví nhận</Label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
              <Wallet className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-mono">
                {externalWallet.slice(0, 6)}...{externalWallet.slice(-4)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-sm text-red-600">Vui lòng kết nối ví để claim reward</p>
          </div>
        )}

        {/* Network Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 rounded-lg p-3">
          <Wallet className="w-4 h-4" />
          <span>Mạng: BNB Smart Chain (BSC)</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
          Hủy
        </Button>
        <Button
          onClick={handleClaim}
          disabled={!isValidAmount() || !externalWallet}
          className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
        >
          <Gift className="w-4 h-4 mr-2" />
          Claim {amount ? formatNumber(Number(amount)) : ''} CAMLY
        </Button>
      </div>
    </>
  );

  const renderConfirmingStep = () => (
    <div className="py-12 text-center">
      <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
        <Loader2 className="w-10 h-10 text-yellow-600 animate-spin" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Đang xử lý giao dịch...</h3>
      <p className="text-muted-foreground mb-4">
        Vui lòng chờ trong khi giao dịch được xác nhận trên blockchain
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="relative py-6 text-center">
      {/* CAMLY Coin Rainbow Logo */}
      <div className="flex justify-center mb-4">
        <img
          src={funEcosystemLogo}
          alt="FUN Ecosystem"
          className="w-24 h-24"
          style={{ filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.6))' }}
        />
      </div>

      {/* Golden Title */}
      <h3
        className="text-2xl font-extrabold mb-4 px-2"
        style={{
          color: '#FFD700',
          textShadow: '0 0 10px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3), 0 2px 4px rgba(0,0,0,0.4)',
        }}
      >
        🎉✨ Chúc Mừng Bạn Vừa Được Đón Nhận Phước Lành Của Cha Và Bé Angel CamLy ! ✨🎉
      </h3>

      {/* Amount Card */}
      <div className="bg-gradient-to-r from-emerald-400 to-green-500 rounded-xl p-4 mx-2 mb-4 shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-yellow-200" />
          <span className="text-white/80 text-sm">Đã nhận thành công</span>
          <Sparkles className="w-5 h-5 text-yellow-200" />
        </div>
        <p className="text-3xl font-extrabold text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
          {formatNumber(result?.amount || 0)} CAMLY
        </p>
        <p className="text-white/70 text-xs mt-1">
          vào ví {result?.wallet_address?.slice(0, 8)}...{result?.wallet_address?.slice(-6)}
        </p>
      </div>

      {/* BscScan Link */}
      {result?.bscscan_url && (
        <a
          href={result.bscscan_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-emerald-600 hover:underline mb-4 text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Xem trên BscScan
        </a>
      )}

      {/* Add CAMLY to MetaMask */}
      <Button
        variant="outline"
        size="sm"
        className="mb-3 border-amber-300 text-amber-700 hover:bg-amber-50"
        onClick={async () => {
          try {
            const provider = (window as any).ethereum;
            if (!provider) {
              toast.error('Vui lòng mở MetaMask');
              return;
            }
            await provider.request({
              method: 'wallet_watchAsset',
              params: {
                type: 'ERC20',
                options: {
                  address: '0x0910320181889feFDE0BB1Ca63962b0A8882e413',
                  symbol: 'CAMLY',
                  decimals: 3,
                },
              },
            });
            toast.success('Đã thêm CAMLY vào ví!');
          } catch {
            toast.error('Không thể thêm token. Vui lòng thêm thủ công.');
          }
        }}
      >
        <Wallet className="w-4 h-4 mr-2" />
        Thêm CAMLY vào ví MetaMask
      </Button>

      <p className="text-[10px] text-white/60 mb-3">
        Nếu không thấy số dư CAMLY, hãy bấm nút trên hoặc thêm thủ công token:<br />
        Contract: 0x0910...e413 | Symbol: CAMLY | Decimals: 3
      </p>

      {/* Footer */}
      <p className="text-xs text-emerald-600 mb-4 font-medium">FUN Profile — Mạnh Thương Quân 💚</p>

      <Button
        onClick={handleClose}
        className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold"
      >
        Đóng
      </Button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="py-8 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-12 h-12 text-red-600" />
      </div>
      <h3 className="text-xl font-semibold text-red-700 mb-2">Claim Chưa Thành Công</h3>
      <p className="text-muted-foreground mb-6">
        {error || 'Đã xảy ra sự cố, vui lòng thử lại sau'}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Đóng</Button>
        <Button onClick={() => setStep('input')} className="flex-1">Thử lại</Button>
      </div>
    </div>
  );

  return (
    <>
      <DonationCelebration isActive={showCelebration} showRichText={true} />
      {showCelebration && <RichTextOverlay />}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="sm:max-w-md max-h-[90vh] overflow-y-auto"
          style={step === 'success' ? {
            background: 'linear-gradient(135deg, #34d399, #10b981)',
            border: 'none',
          } : undefined}
        >
          {step === 'input' && renderInputStep()}
          {step === 'confirming' && renderConfirmingStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'error' && renderErrorStep()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClaimRewardDialog;
