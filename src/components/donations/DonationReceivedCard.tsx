import { useState, useEffect, useRef } from 'react';
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
  X,
  Heart,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import funEcosystemLogo from '@/assets/tokens/fun-ecosystem-logo.gif';
import celebrationBgVideo from '@/assets/tet6-3.mp4';
import { RichTextOverlay } from './RichTextOverlay';
import { playCelebrationMusic } from '@/lib/celebrationSounds';
import { useNavigate } from 'react-router-dom';

// Mốc thời gian: từ 17/2/2026 00:00 (UTC+7) trở đi dùng giao diện Tết
const TET_CUTOFF = new Date('2026-02-16T17:00:00.000Z'); // 17/2/2026 00:00 UTC+7

export interface DonationReceivedData {
  id: string;
  amount: string;
  tokenSymbol: string;
  senderUsername: string;
  senderAvatarUrl?: string | null;
  senderId: string;
  message?: string | null;
  txHash: string;
  createdAt: string;
}

interface DonationReceivedCardProps {
  isOpen: boolean;
  onClose: () => void;
  data: DonationReceivedData;
}

export const DonationReceivedCard = ({
  isOpen,
  onClose,
  data,
}: DonationReceivedCardProps) => {
  const [isCelebrationActive, setIsCelebrationActive] = useState(true);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isTetTheme = new Date(data.createdAt) >= TET_CUTOFF;

  // Play looped music when card opens, stop when closed
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

  const handleSendThanks = () => {
    handleClose();
    navigate(`/chat?userId=${data.senderId}`);
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
            className="relative rounded-2xl overflow-hidden animate-glow-radiate"
            style={{
              ...(isTetTheme
                ? { aspectRatio: '3 / 2' }
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

            {/* Green radiant border */}
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

            {/* Content */}
            <div className={`relative text-center ${isTetTheme ? 'p-3 flex flex-col justify-between h-full' : 'p-4'}`}>
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
                  className={`font-extrabold flex items-center justify-center gap-1 drop-shadow-sm leading-tight ${isTetTheme ? 'text-lg' : 'text-2xl gap-2'}`}
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

              {/* Amount */}
              <div
                className={isTetTheme ? 'my-2 py-2 px-3 rounded-xl' : 'my-3 py-3 px-4 rounded-xl'}
                style={{
                  background: isTetTheme
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.85) 0%, rgba(16,185,129,0.85) 50%, rgba(34,197,94,0.85) 100%)'
                    : 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #22c55e 100%)',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.5)',
                }}
              >
                <div
                  className={`font-bold text-white ${isTetTheme ? 'text-2xl mb-0.5' : 'text-3xl mb-1'}`}
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                >
                  💰 {Number(data.amount).toLocaleString()} {data.tokenSymbol} 💰
                </div>

                <div className={`flex items-center justify-center gap-2 text-green-100 ${isTetTheme ? 'text-sm' : ''}`}>
                  <span>Từ</span>
                  <Avatar className={`ring-2 ring-white/50 ${isTetTheme ? 'w-5 h-5' : 'w-6 h-6'}`}>
                    <AvatarImage src={data.senderAvatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-white text-green-600">
                      {data.senderUsername[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleClose(); navigate(`/profile/${data.senderId}`); }} className="font-bold hover:underline cursor-pointer">@{data.senderUsername}</button>
                  <span>với tình yêu thương 💚</span>
                </div>
              </div>

              {/* Message */}
              {data.message && (
                <div className={`backdrop-blur-sm rounded-xl text-left border border-green-300 shadow-lg ${isTetTheme ? 'bg-white/70 p-2 mb-2' : 'bg-white/80 p-3 mb-3'}`}>
                  <div className={`flex items-start ${isTetTheme ? 'gap-2' : 'gap-3'}`}>
                    <MessageCircle className={`text-green-600 flex-shrink-0 mt-0.5 ${isTetTheme ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    <p className={`text-green-800 italic ${isTetTheme ? 'text-sm' : 'text-lg'}`}>"{data.message}"</p>
                  </div>
                </div>
              )}

              {/* Bottom section */}
              <div>
                {/* Time */}
                <div
                  className={isTetTheme ? 'text-xs text-white/90 mb-2' : 'text-sm text-green-700 mb-3'}
                  style={isTetTheme ? { textShadow: '0 1px 3px rgba(0,0,0,0.5)' } : undefined}
                >
                  {format(new Date(data.createdAt), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
                </div>

                {/* Actions */}
                <div className={`flex items-center justify-center ${isTetTheme ? 'gap-2' : 'gap-3'}`}>
                  <a href={getBscScanTxUrl(data.txHash, data.tokenSymbol)} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className={`gap-1.5 border-green-400 text-green-800 ${isTetTheme ? 'bg-white/90 hover:bg-green-50 text-xs' : 'bg-white hover:bg-green-50'}`}>
                      <ExternalLink className={isTetTheme ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                      Xem BSCScan
                    </Button>
                  </a>
                  <Button size="sm" className={`gap-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 ${isTetTheme ? 'text-xs' : ''}`} onClick={handleSendThanks}>
                    <Heart className={isTetTheme ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                    {isTetTheme ? 'Cảm Ơn' : 'Gửi Lời Cảm Ơn'}
                  </Button>
                  <Button variant="outline" size="sm" className={`gap-1.5 border-green-400 text-green-800 ${isTetTheme ? 'bg-white/90 hover:bg-green-50 text-xs' : 'bg-white hover:bg-green-50'}`} onClick={handleClose}>
                    <X className={isTetTheme ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                    Đóng
                  </Button>
                </div>

                <div
                  className={`font-medium ${isTetTheme ? 'mt-2 text-xs text-white/80' : 'mt-4 text-xs text-green-600'}`}
                  style={isTetTheme ? { textShadow: '0 1px 3px rgba(0,0,0,0.5)' } : undefined}
                >
                  💚 FUN Profile • Mạnh Thường Quân 💚
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
