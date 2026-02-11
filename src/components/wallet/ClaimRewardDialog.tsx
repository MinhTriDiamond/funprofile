import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Gift, Wallet, ExternalLink, Loader2, AlertCircle, Sparkles, Heart } from 'lucide-react';
import { useClaimReward } from '@/hooks/useClaimReward';
import { DonationCelebration } from '@/components/donations/DonationCelebration';
import { playCelebrationMusicLoop } from '@/lib/celebrationSounds';
import camlyCoinRainbow from '@/assets/tokens/camly-coin-rainbow.png';

const MINIMUM_CLAIM = 1;

interface ClaimRewardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimableAmount: number;
  externalWallet: string | null;
  camlyPrice: number;
  onSuccess: () => void;
}

type ClaimStep = 'input' | 'confirming' | 'success' | 'error';

export const ClaimRewardDialog = ({
  open,
  onOpenChange,
  claimableAmount,
  externalWallet,
  camlyPrice,
  onSuccess,
}: ClaimRewardDialogProps) => {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<ClaimStep>('input');
  const [showCelebration, setShowCelebration] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { claimReward, isLoading, error, result, reset } = useClaimReward();

  const stopCelebration = useCallback(() => {
    setShowCelebration(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      setAmount('');
      setStep('input');
      setShowCelebration(false);
      reset();
    } else {
      stopCelebration();
    }
  }, [open, reset, stopCelebration]);

  useEffect(() => {
    if (step === 'success' && !showCelebration) {
      setShowCelebration(true);
      audioRef.current = playCelebrationMusicLoop('rich-3');
    }
  }, [step, showCelebration]);

  const formatNumber = (num: number) => num.toLocaleString('vi-VN');
  const formatUsd = (num: number) => `$${(num * camlyPrice).toFixed(2)}`;

  const handleMaxClick = () => setAmount(claimableAmount.toString());

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(/[^0-9]/g, ''));
  };

  const isValidAmount = () => {
    const numAmount = Number(amount);
    return numAmount >= MINIMUM_CLAIM && numAmount <= claimableAmount;
  };

  const handleClaim = async () => {
    if (!externalWallet) return;
    setStep('confirming');
    const claimResult = await claimReward(Number(amount), externalWallet);
    if (claimResult) {
      setStep('success');
      onSuccess();
    } else {
      setStep('error');
    }
  };

  const handleClose = () => {
    stopCelebration();
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

      <div className="space-y-6 py-4">
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-700 mb-1">Số dư khả dụng</p>
          <p className="text-2xl font-bold text-yellow-800">
            {formatNumber(claimableAmount)} CAMLY
          </p>
          <p className="text-sm text-yellow-600">~{formatUsd(claimableAmount)}</p>
        </div>

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
          {amount && Number(amount) > claimableAmount && (
            <p className="text-sm text-red-500">Vượt quá số dư khả dụng</p>
          )}
        </div>

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

        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 rounded-lg p-3">
          <Wallet className="w-4 h-4" />
          <span>Mạng: BNB Smart Chain (BSC)</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Hủy</Button>
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
      <p className="text-muted-foreground mb-4">Vui lòng chờ trong khi giao dịch được xác nhận trên blockchain</p>
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="relative py-6 text-center overflow-hidden">
      {/* Green gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-400 via-emerald-300 to-green-500 opacity-20 rounded-xl" />

      <div className="relative z-10">
        {/* CAMLY Coin Rainbow Logo */}
        <div className="relative mx-auto mb-4 w-28 h-28">
          <img
            src={camlyCoinRainbow}
            alt="CAMLY Coin"
            className="w-28 h-28 object-contain animate-bounce"
            style={{ filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))' }}
          />
          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
          <Heart className="absolute -bottom-1 -left-2 w-6 h-6 text-pink-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Golden Title */}
        <h3
          className="text-lg font-extrabold mb-4 px-2 leading-relaxed"
          style={{
            color: '#FFD700',
            textShadow: '0 0 10px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3), 0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          🎉✨ Chúc mừng! Bạn vừa nhận được đồng tiền hạnh phúc của Cha và Bé Angel CamLy! ✨🎉
        </h3>

        {/* Amount Card */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 mx-4 mb-4 shadow-lg">
          <p className="text-white/80 text-sm mb-1">Đã chuyển thành công</p>
          <p
            className="text-3xl font-black text-white"
            style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.5)' }}
          >
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
            className="inline-flex items-center gap-2 text-emerald-600 hover:underline mb-4 text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Xem trên BscScan
          </a>
        )}

        {/* Close Button */}
        <Button
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg"
        >
          Đóng
        </Button>

        {/* Footer */}
        <p className="text-xs text-muted-foreground mt-3">
          FUN Profile — Mạnh Thường Quân 💚
        </p>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="py-8 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-12 h-12 text-red-600" />
      </div>
      <h3 className="text-xl font-semibold text-red-700 mb-2">Claim Chưa Thành Công</h3>
      <p className="text-muted-foreground mb-6">
        {error || 'Đã xảy ra lỗi, vui lòng thử lại sau'}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Đóng</Button>
        <Button onClick={() => setStep('input')} className="flex-1">Thử lại</Button>
      </div>
    </div>
  );

  return (
    <>
      <DonationCelebration isActive={showCelebration} showRichText />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
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
