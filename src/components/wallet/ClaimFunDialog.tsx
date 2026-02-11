import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Zap, Wallet, ArrowRight, Loader2, Sparkles, Heart } from 'lucide-react';
import { formatFUN } from '@/config/pplp';
import { useClaimFun } from '@/hooks/useClaimFun';
import { DonationCelebration } from '@/components/donations/DonationCelebration';
import { playCelebrationMusicLoop } from '@/lib/celebrationSounds';
import funLogo from '@/assets/tokens/fun-logo.png';

interface ClaimFunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activatedBalance: number;
  onSuccess?: () => void;
}

export const ClaimFunDialog = ({
  open,
  onOpenChange,
  activatedBalance,
  onSuccess,
}: ClaimFunDialogProps) => {
  const [amount, setAmount] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number[]>([0]);
  const [showCelebration, setShowCelebration] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { claimFun, isProcessing, isConfirming, isSuccess } = useClaimFun({
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const stopCelebration = useCallback(() => {
    setShowCelebration(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isSuccess && !showCelebration) {
      setShowCelebration(true);
      audioRef.current = playCelebrationMusicLoop('rich-3');
    }
  }, [isSuccess, showCelebration]);

  useEffect(() => {
    if (!open) {
      stopCelebration();
      setAmount(0);
      setSliderValue([0]);
    }
  }, [open, stopCelebration]);

  useEffect(() => {
    if (activatedBalance > 0) {
      const percent = (amount / activatedBalance) * 100;
      setSliderValue([Math.min(100, Math.max(0, percent))]);
    }
  }, [amount, activatedBalance]);

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    setAmount(Math.floor((value[0] / 100) * activatedBalance));
  };

  const handleMaxClick = () => {
    setAmount(Math.floor(activatedBalance));
    setSliderValue([100]);
  };

  const handleClose = () => {
    stopCelebration();
    onOpenChange(false);
  };

  return (
    <>
      <DonationCelebration isActive={showCelebration} showRichText />
      <Dialog open={open} onOpenChange={isSuccess ? handleClose : onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          {isSuccess ? (
            /* ===== SUCCESS CELEBRATION ===== */
            <div className="relative py-6 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-green-400 via-emerald-300 to-green-500 opacity-20 rounded-xl" />
              <div className="relative z-10">
                <div className="relative mx-auto mb-4 w-24 h-24">
                  <img src={funLogo} alt="FUN Token" className="w-24 h-24 rounded-full object-contain animate-bounce" style={{ filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))' }} />
                  <Sparkles className="absolute -top-2 -right-2 w-7 h-7 text-yellow-400 animate-pulse" />
                  <Heart className="absolute -bottom-1 -left-2 w-5 h-5 text-pink-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>
                <h3 className="text-lg font-extrabold mb-4 px-2 leading-relaxed" style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3), 0 2px 4px rgba(0,0,0,0.3)' }}>
                  🎉✨ Chúc mừng! Bạn vừa nhận được đồng tiền hạnh phúc! ✨🎉
                </h3>
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 mx-4 mb-4 shadow-lg">
                  <p className="text-white/80 text-sm mb-1">Đã chuyển về ví thành công</p>
                  <p className="text-3xl font-black text-white" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.5)' }}>{formatFUN(amount)} FUN</p>
                </div>
                <Button onClick={handleClose} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg">Đóng</Button>
                <p className="text-xs text-muted-foreground mt-3">FUN Profile — Mạnh Thường Quân 💚</p>
              </div>
            </div>
          ) : (
            /* ===== INPUT FORM ===== */
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  Claim FUN về Ví
                </DialogTitle>
                <DialogDescription>Chuyển FUN đã ACTIVATED về ví cá nhân để sử dụng tự do</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-700">Số dư ACTIVATED</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={funLogo} alt="FUN" className="w-5 h-5 rounded-full" />
                      <span className="font-bold text-green-700">{formatFUN(activatedBalance)} FUN</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Số lượng Claim</Label>
                    <Button variant="ghost" size="sm" onClick={handleMaxClick}>Max</Button>
                  </div>
                  <div className="relative">
                    <Input type="number" value={amount} onChange={(e) => setAmount(Math.min(activatedBalance, Number(e.target.value) || 0))} max={activatedBalance} min={0} className="pr-16 text-lg" placeholder="0" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">FUN</span>
                  </div>
                  <Slider value={sliderValue} onValueChange={handleSliderChange} max={100} step={1} className="py-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <Zap className="w-6 h-6 text-green-500 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">ACTIVATED</p>
                      <p className="font-semibold text-green-600">-{formatFUN(amount)}</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    <div className="text-center">
                      <Wallet className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">VÍ CÁ NHÂN</p>
                      <p className="font-semibold text-emerald-600">+{formatFUN(amount)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Badge variant="outline" className="text-xs shrink-0">Gas Fee</Badge>
                  <p>Giao dịch này yêu cầu một lượng nhỏ BNB để trả phí gas trên BSC Testnet</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Hủy</Button>
                <Button onClick={() => claimFun(amount)} disabled={amount <= 0 || isProcessing} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isConfirming ? 'Đang xác nhận...' : 'Đang gửi...'}</>
                  ) : (
                    <><Wallet className="w-4 h-4 mr-2" />Claim {formatFUN(amount)} FUN</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
