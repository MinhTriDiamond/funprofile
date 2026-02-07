import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DonationCelebration } from './DonationCelebration';
import { getTxUrl } from '@/config/pplp';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ExternalLink,
  Camera,
  X,
  Gift,
  User,
  Target,
  MessageCircle,
  Clock,
  Link2,
  Sparkles,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export interface DonationCardData {
  id: string;
  amount: string;
  tokenSymbol: string;
  senderUsername: string;
  senderAvatarUrl?: string | null;
  recipientUsername: string;
  recipientAvatarUrl?: string | null;
  message?: string | null;
  txHash: string;
  lightScoreEarned: number;
  createdAt: string;
}

interface DonationSuccessCardProps {
  isOpen: boolean;
  onClose: () => void;
  data: DonationCardData;
}

export const DonationSuccessCard = ({
  isOpen,
  onClose,
  data,
}: DonationSuccessCardProps) => {
  const [isCelebrationActive, setIsCelebrationActive] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    setIsCelebrationActive(false);
    onClose();
  };

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    
    setIsSaving(true);
    try {
      // Temporarily hide action buttons for screenshot
      const buttons = cardRef.current.querySelector('[data-action-buttons]');
      if (buttons) buttons.classList.add('opacity-0');
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      
      if (buttons) buttons.classList.remove('opacity-0');
      
      const link = document.createElement('a');
      link.download = `donation-${data.id.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Đã lưu hình ảnh thành công!');
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Không thể lưu hình ảnh');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DonationCelebration isActive={isOpen && isCelebrationActive} />
      
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent 
          className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden"
        >
          <div
            ref={cardRef}
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
            }}
          >
            {/* Gold border effect */}
            <div className="absolute inset-0 rounded-2xl border-2 border-gold/50 pointer-events-none" />
            
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative p-6 text-center">
              {/* Header */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 text-gold text-sm font-medium mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>✨ 🎉 ✨</span>
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                  <Gift className="w-6 h-6 text-gold" />
                  CHÚC MỪNG TẶNG THƯỞNG THÀNH CÔNG!
                </h2>
              </div>

              {/* Amount display */}
              <div className="my-6 py-4 px-6 rounded-xl bg-gradient-to-r from-gold/20 to-amber-500/20 border border-gold/30">
                <div className="text-4xl font-bold text-gold mb-1">
                  ⭐ {Number(data.amount).toLocaleString()} {data.tokenSymbol} ⭐
                </div>
                <div className="text-sm text-muted-foreground">
                  ≈ Priceless với tình yêu thương 💛
                </div>
              </div>

              {/* Details */}
              <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 space-y-3 text-left">
                {/* Sender */}
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground w-24">Người tặng:</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={data.senderAvatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {data.senderUsername[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-white">@{data.senderUsername}</span>
                  </div>
                </div>

                {/* Recipient */}
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-gold flex-shrink-0" />
                  <span className="text-muted-foreground w-24">Người nhận:</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={data.recipientAvatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {data.recipientUsername[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-white">@{data.recipientUsername}</span>
                  </div>
                </div>

                {/* Message */}
                {data.message && (
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground w-24">Lời nhắn:</span>
                    <p className="text-white italic flex-1">"{data.message}"</p>
                  </div>
                )}

                {/* Time */}
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground w-24">Thời gian:</span>
                  <span className="text-white">
                    {format(new Date(data.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                  </span>
                </div>

                {/* TX Hash */}
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground w-24">TX Hash:</span>
                  <a
                    href={getTxUrl(data.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate flex-1 font-mono text-sm"
                  >
                    {data.txHash.slice(0, 10)}...{data.txHash.slice(-8)}
                  </a>
                </div>
              </div>

              {/* Light Score earned */}
              {data.lightScoreEarned > 0 && (
                <div className="mt-4 py-3 px-4 rounded-xl bg-primary/10 border border-primary/30">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-semibold">
                      +{data.lightScoreEarned} Light Score được cộng vào hồ sơ của bạn!
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div
                data-action-buttons
                className="flex items-center justify-center gap-3 mt-6"
              >
                <a
                  href={getTxUrl(data.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Xem BSCScan
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleSaveImage}
                  disabled={isSaving}
                >
                  <Camera className="w-4 h-4" />
                  {isSaving ? 'Đang lưu...' : 'Lưu Hình'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={handleClose}
                >
                  <X className="w-4 h-4" />
                  Đóng
                </Button>
              </div>

              {/* Footer branding */}
              <div className="mt-4 text-xs text-muted-foreground">
                FUN Profile • Mạnh Thường Quân
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
