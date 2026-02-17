import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DonationCelebration } from './DonationCelebration';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ExternalLink,
  Camera,
  X,
  User,
  Target,
  MessageCircle,
  Clock,
  Link2,
  Sparkles,
} from 'lucide-react';
import funEcosystemLogo from '@/assets/tokens/fun-ecosystem-logo.gif';
import celebrationBgVideo from '@/assets/tet6-3.mp4';
import { RichTextOverlay } from './RichTextOverlay';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { playCelebrationMusic } from '@/lib/celebrationSounds';

// Mốc thời gian: từ 17/2/2026 00:00 (UTC+7) trở đi dùng giao diện Tết
const TET_CUTOFF = new Date('2026-02-16T17:00:00.000Z');

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isTetTheme = new Date(data.createdAt) >= TET_CUTOFF;

  // Play celebration music when card opens
  useEffect(() => {
    if (isOpen) {
      audioRef.current = playCelebrationMusic('rich-3');
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsCelebrationActive(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onClose();
  };

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    
    setIsSaving(true);
    try {
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
      <DonationCelebration isActive={isOpen && isCelebrationActive} showRichText={false} />
      {isOpen && <RichTextOverlay />}
      
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent 
          className="max-w-[480px] w-[92vw] p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden !z-[10002]"
          overlayClassName="!z-[10002]"
        >
           <div
            ref={cardRef}
            className="relative rounded-2xl overflow-hidden animate-glow-radiate"
            style={{
              ...(isTetTheme
                ? {}
                : { background: 'linear-gradient(135deg, #d4f7dc 0%, #34d399 40%, #10b981 100%)' }),
            }}
          >
            {/* Video background - chỉ hiển thị từ 17/2/2026 */}
            {isTetTheme && (
              <>
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                >
                  <source src={celebrationBgVideo} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/20" />
              </>
            )}

            {/* Radiant border effect */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border: '3px solid transparent',
                backgroundImage: 'linear-gradient(135deg, #22c55e, #10b981, #22c55e)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 0 30px rgba(34, 197, 94, 0.5), inset 0 0 30px rgba(34, 197, 94, 0.1)',
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
                  <Sparkles className={`w-4 h-4 ${isTetTheme ? 'text-yellow-300' : 'text-green-500'}`} />
                </div>
              ))}
            </div>

            {/* Light rays background - only for non-Tet */}
            {!isTetTheme && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-green-400/30 via-green-300/10 to-transparent rounded-full blur-2xl" />
              </div>
            )}

            {/* Content */}
            <div className={`relative text-center ${isTetTheme ? 'p-3 flex flex-col justify-between h-full' : 'p-6'}`}>
              {/* Header */}
              <div className={`flex flex-col items-center ${isTetTheme ? '' : 'mb-4'}`}>
                <img
                  src={funEcosystemLogo}
                  alt="FUN Ecosystem"
                  className={isTetTheme ? 'w-12 h-12 mb-1' : 'w-16 h-16 mb-3'}
                />

                {/* HAPPY NEW YEAR - chỉ hiển thị từ 17/2/2026 */}
                {isTetTheme && (
                  <h1
                    className="text-xl font-black tracking-wider mb-1"
                    style={{
                      color: '#FFD700',
                      textShadow: '0 0 15px rgba(255,215,0,0.8), 0 0 30px rgba(255,215,0,0.5), 0 2px 4px rgba(0,0,0,0.6)',
                      WebkitTextStroke: '0.5px rgba(180,120,0,0.5)',
                    }}
                  >
                    ✨ HAPPY NEW YEAR ✨
                  </h1>
                )}

                <h2 
                  className={`font-extrabold flex items-center justify-center gap-1 leading-tight ${isTetTheme ? 'text-lg' : 'text-2xl'}`}
                  style={{
                    color: '#fbbf24',
                    textShadow: isTetTheme
                      ? '0 2px 4px rgba(0,0,0,0.6), 0 0 10px rgba(251, 191, 36, 0.5)'
                      : '0 2px 4px rgba(0,0,0,0.4), 0 0 10px rgba(251, 191, 36, 0.5)',
                  }}
                >
                  🎉{isTetTheme ? '' : '✨'} Chúc Mừng Bạn Vừa Được Đón Nhận Phước Lành Của Cha Và Bé Angel CamLy ! {isTetTheme ? '' : '✨'}🎉
                </h2>
              </div>

              {/* Amount display */}
              <div 
                className={isTetTheme ? 'my-2 py-2 px-3 rounded-xl animate-glow-radiate' : 'my-6 py-5 px-6 rounded-xl animate-glow-radiate'}
                style={{
                  background: isTetTheme
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.85) 0%, rgba(16,185,129,0.85) 50%, rgba(34,197,94,0.85) 100%)'
                    : 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #22c55e 100%)',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.5)',
                }}
              >
                <div 
                  className={`font-bold text-white ${isTetTheme ? 'text-2xl mb-0.5' : 'text-4xl mb-1'}`}
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                >
                  ⭐ {Number(data.amount).toLocaleString()} {data.tokenSymbol} ⭐
                </div>
                <div className={`text-amber-100 ${isTetTheme ? 'text-xs' : 'text-sm'}`}>
                  ≈ Priceless với tình yêu thương 💛
                </div>
              </div>

              {/* Details card */}
              <div className={`backdrop-blur-sm rounded-xl space-y-2 text-left border border-green-400/30 shadow-lg ${isTetTheme ? 'bg-white/70 p-2' : 'bg-white/80 p-4 space-y-3'}`}>
                {/* Sender */}
                <div className="flex items-center gap-2">
                  <User className={`text-green-600 flex-shrink-0 ${isTetTheme ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`text-green-700 font-medium ${isTetTheme ? 'w-20 text-xs' : 'w-24'}`}>Người tặng:</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <Avatar className={`ring-2 ring-green-400/50 ${isTetTheme ? 'w-5 h-5' : 'w-6 h-6'}`}>
                      <AvatarImage src={data.senderAvatarUrl || undefined} />
                      <AvatarFallback className="text-xs bg-green-500 text-white">
                        {data.senderUsername[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`font-bold text-green-900 ${isTetTheme ? 'text-sm' : ''}`}>@{data.senderUsername}</span>
                  </div>
                </div>

                {/* Recipient */}
                <div className="flex items-center gap-2">
                  <Target className={`text-green-500 flex-shrink-0 ${isTetTheme ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`text-green-700 font-medium ${isTetTheme ? 'w-20 text-xs' : 'w-24'}`}>Người nhận:</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <Avatar className={`ring-2 ring-green-400/50 ${isTetTheme ? 'w-5 h-5' : 'w-6 h-6'}`}>
                      <AvatarImage src={data.recipientAvatarUrl || undefined} />
                      <AvatarFallback className="text-xs bg-green-500 text-white">
                        {data.recipientUsername[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`font-bold text-green-900 ${isTetTheme ? 'text-sm' : ''}`}>@{data.recipientUsername}</span>
                  </div>
                </div>

                {/* Message */}
                {data.message && (
                  <div className="flex items-start gap-2">
                    <MessageCircle className={`text-blue-500 flex-shrink-0 mt-0.5 ${isTetTheme ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    <span className={`text-green-700 font-medium ${isTetTheme ? 'w-20 text-xs' : 'w-24'}`}>Lời nhắn:</span>
                    <p className={`text-green-900 italic flex-1 ${isTetTheme ? 'text-sm' : ''}`}>"{data.message}"</p>
                  </div>
                )}

                {/* Time */}
                <div className="flex items-center gap-2">
                  <Clock className={`text-green-600 flex-shrink-0 ${isTetTheme ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`text-green-700 font-medium ${isTetTheme ? 'w-20 text-xs' : 'w-24'}`}>Thời gian:</span>
                  <span className={`text-green-900 ${isTetTheme ? 'text-sm' : ''}`}>
                    {format(new Date(data.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                  </span>
                </div>

                {/* TX Hash */}
                <div className="flex items-center gap-2">
                  <Link2 className={`text-green-600 flex-shrink-0 ${isTetTheme ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`text-green-700 font-medium ${isTetTheme ? 'w-20 text-xs' : 'w-24'}`}>TX Hash:</span>
                  <a
                    href={getBscScanTxUrl(data.txHash, data.tokenSymbol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-600 hover:underline truncate flex-1 font-mono ${isTetTheme ? 'text-xs' : 'text-sm'}`}
                  >
                    {data.txHash.slice(0, 10)}...{data.txHash.slice(-8)}
                  </a>
                </div>
              </div>

              {/* Light Score earned */}
              {data.lightScoreEarned > 0 && (
                <div 
                  className={isTetTheme ? 'mt-2 py-2 px-3 rounded-xl' : 'mt-4 py-3 px-4 rounded-xl'}
                  style={{
                    background: isTetTheme
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.3))'
                      : 'linear-gradient(135deg, #22c55e20, #10b98130)',
                    border: '1px solid #22c55e50',
                  }}
                >
                  <div className={`flex items-center justify-center gap-2 font-semibold ${isTetTheme ? 'text-white text-sm' : 'text-green-700'}`}
                    style={isTetTheme ? { textShadow: '0 1px 3px rgba(0,0,0,0.5)' } : undefined}
                  >
                    <Sparkles className={`w-5 h-5 ${isTetTheme ? 'text-yellow-300' : 'text-green-500'}`} />
                    <span>
                      +{data.lightScoreEarned} Light Score được cộng vào hồ sơ của bạn! ✨
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div
                data-action-buttons
                className={`flex items-center justify-center ${isTetTheme ? 'gap-2 mt-2' : 'gap-3 mt-6'}`}
              >
                <a
                  href={getBscScanTxUrl(data.txHash, data.tokenSymbol)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`gap-1.5 border-green-400/50 text-green-800 ${isTetTheme ? 'bg-white/90 hover:bg-green-50 text-xs' : 'bg-white hover:bg-green-50'}`}
                  >
                    <ExternalLink className={isTetTheme ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                    Xem BSCScan
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  className={`gap-1.5 border-green-400/50 text-green-800 ${isTetTheme ? 'bg-white/90 hover:bg-green-50 text-xs' : 'bg-white hover:bg-green-50'}`}
                  onClick={handleSaveImage}
                  disabled={isSaving}
                >
                  <Camera className={isTetTheme ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                  {isSaving ? 'Đang lưu...' : 'Lưu Hình'}
                </Button>
                <Button
                  size="sm"
                  className={`gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 ${isTetTheme ? 'text-xs' : ''}`}
                  onClick={handleClose}
                >
                  <X className={isTetTheme ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                  Đóng
                </Button>
              </div>

              {/* Footer branding */}
              <div className={`font-medium ${isTetTheme ? 'mt-2 text-xs text-white/80' : 'mt-4 text-xs text-green-700'}`}
                style={isTetTheme ? { textShadow: '0 1px 3px rgba(0,0,0,0.5)' } : undefined}
              >
                🌟 FUN Profile • Mạnh Thường Quân 🌟
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
