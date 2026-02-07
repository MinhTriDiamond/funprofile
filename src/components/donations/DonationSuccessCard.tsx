import { useState, useRef, useEffect } from 'react';
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
import { playCelebrationSounds } from '@/lib/celebrationSounds';

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

  // Play celebration sounds when card opens
  useEffect(() => {
    if (isOpen) {
      playCelebrationSounds();
    }
  }, [isOpen]);

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
            className="relative rounded-2xl overflow-hidden animate-glow-radiate"
            style={{
              background: 'linear-gradient(135deg, #fffef5 0%, #fff9e6 30%, #fff3cc 70%, #ffe4a0 100%)',
            }}
          >
            {/* Radiant gold border effect */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border: '3px solid transparent',
                backgroundImage: 'linear-gradient(135deg, #ffd700, #ffb347, #ffd700)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.1)',
              }}
            />
            
            {/* Sparkle decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-sparkle-float"
                  style={{
                    left: `${10 + (i * 12)}%`,
                    top: `${Math.random() * 30}%`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                >
                  <Sparkles className="w-4 h-4 text-gold" />
                </div>
              ))}
            </div>

            {/* Light rays background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-gold/30 via-gold/10 to-transparent rounded-full blur-2xl" />
            </div>

            {/* Content */}
            <div className="relative p-6 text-center">
              {/* Header with celebration emojis */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 text-gold text-lg font-bold mb-2">
                  ✨ 🎊 🎉 🎊 ✨
                </div>
                <h2 className="text-2xl font-bold text-amber-800 flex items-center justify-center gap-2 drop-shadow-sm">
                  <Gift className="w-7 h-7 text-gold animate-bounce" />
                  CHÚC MỪNG TẶNG THƯỞNG THÀNH CÔNG!
                </h2>
              </div>

              {/* Amount display with radiant glow */}
              <div 
                className="my-6 py-5 px-6 rounded-xl animate-glow-radiate"
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffb347 50%, #ffd700 100%)',
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.5)',
                }}
              >
                <div 
                  className="text-4xl font-bold text-white mb-1"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                >
                  ⭐ {Number(data.amount).toLocaleString()} {data.tokenSymbol} ⭐
                </div>
                <div className="text-sm text-amber-100">
                  ≈ Priceless với tình yêu thương 💛
                </div>
              </div>

              {/* Details card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 space-y-3 text-left border border-gold/30 shadow-lg">
                {/* Sender */}
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span className="text-amber-700 w-24 font-medium">Người tặng:</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="w-6 h-6 ring-2 ring-gold/50">
                      <AvatarImage src={data.senderAvatarUrl || undefined} />
                      <AvatarFallback className="text-xs bg-gold text-white">
                        {data.senderUsername[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-amber-900">@{data.senderUsername}</span>
                  </div>
                </div>

                {/* Recipient */}
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-gold flex-shrink-0" />
                  <span className="text-amber-700 w-24 font-medium">Người nhận:</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="w-6 h-6 ring-2 ring-gold/50">
                      <AvatarImage src={data.recipientAvatarUrl || undefined} />
                      <AvatarFallback className="text-xs bg-gold text-white">
                        {data.recipientUsername[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-amber-900">@{data.recipientUsername}</span>
                  </div>
                </div>

                {/* Message */}
                {data.message && (
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-amber-700 w-24 font-medium">Lời nhắn:</span>
                    <p className="text-amber-900 italic flex-1">"{data.message}"</p>
                  </div>
                )}

                {/* Time */}
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span className="text-amber-700 w-24 font-medium">Thời gian:</span>
                  <span className="text-amber-900">
                    {format(new Date(data.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                  </span>
                </div>

                {/* TX Hash */}
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span className="text-amber-700 w-24 font-medium">TX Hash:</span>
                  <a
                    href={getTxUrl(data.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate flex-1 font-mono text-sm"
                  >
                    {data.txHash.slice(0, 10)}...{data.txHash.slice(-8)}
                  </a>
                </div>
              </div>

              {/* Light Score earned */}
              {data.lightScoreEarned > 0 && (
                <div 
                  className="mt-4 py-3 px-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e20, #10b98130)',
                    border: '1px solid #22c55e50',
                  }}
                >
                  <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                    <Sparkles className="w-5 h-5 text-green-500" />
                    <span>
                      +{data.lightScoreEarned} Light Score được cộng vào hồ sơ của bạn! ✨
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 bg-white hover:bg-amber-50 border-gold/50 text-amber-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Xem BSCScan
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white hover:bg-amber-50 border-gold/50 text-amber-800"
                  onClick={handleSaveImage}
                  disabled={isSaving}
                >
                  <Camera className="w-4 h-4" />
                  {isSaving ? 'Đang lưu...' : 'Lưu Hình'}
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-gold to-amber-500 hover:from-gold-hover hover:to-amber-600 text-white border-0"
                  onClick={handleClose}
                >
                  <X className="w-4 h-4" />
                  Đóng
                </Button>
              </div>

              {/* Footer branding */}
              <div className="mt-4 text-xs text-amber-600 font-medium">
                🌟 FUN Profile • Mạnh Thường Quân 🌟
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
