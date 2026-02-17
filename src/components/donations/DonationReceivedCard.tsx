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
import { RichTextOverlay } from './RichTextOverlay';
import { playCelebrationMusicLoop } from '@/lib/celebrationSounds';
import { useNavigate } from 'react-router-dom';
import tetBackground from '@/assets/tet6-4.mp4';

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

const isTetSeason = new Date() >= new Date('2026-02-17T00:00:00');

export const DonationReceivedCard = ({
  isOpen,
  onClose,
  data,
}: DonationReceivedCardProps) => {
  const [isCelebrationActive, setIsCelebrationActive] = useState(true);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play looped music when card opens, stop when closed
  useEffect(() => {
    if (isOpen) {
      audioRef.current = playCelebrationMusicLoop('rich-3');
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
            style={isTetSeason ? {} : {
              background: 'linear-gradient(135deg, #d4f7dc 0%, #34d399 40%, #10b981 100%)',
            }}
          >
            {/* Tet video background */}
            {isTetSeason && (
              <video
                autoPlay loop muted playsInline
                className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                src={tetBackground}
              />
            )}

            {/* Border glow */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={isTetSeason ? {
                border: '3px solid transparent',
                backgroundImage: 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.1)',
              } : {
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
                  <Sparkles className={`w-4 h-4 ${isTetSeason ? 'text-yellow-400' : 'text-green-500'}`} />
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="relative p-4 text-center">
              {/* Header */}
              <div className="mb-4 flex flex-col items-center">
                <img
                  src={funEcosystemLogo}
                  alt="FUN Ecosystem"
                  className="w-16 h-16 mb-3"
                />

                {/* HAPPY NEW YEAR for Tet */}
                {isTetSeason && (
                  <h3
                    className="text-2xl font-extrabold mb-2"
                    style={{
                      color: '#FFD700',
                      textShadow: '0 0 10px rgba(255,215,0,0.6), 0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,215,0,0.2), 0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    ✨ HAPPY NEW YEAR ✨
                  </h3>
                )}

                <h2
                  className="text-2xl font-extrabold flex items-center justify-center gap-2 drop-shadow-sm leading-tight"
                  style={isTetSeason ? {
                    color: '#fff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 0 10px rgba(255, 215, 0, 0.4)',
                  } : {
                    color: '#fbbf24',
                    textShadow: '0 2px 4px rgba(0,0,0,0.4), 0 0 10px rgba(251, 191, 36, 0.5)',
                  }}
                >
                  🎉✨ Chúc Mừng Bạn Vừa Được Đón Nhận Phước Lành Của Cha Và Bé Angel CamLy ! ✨🎉
                </h2>
              </div>

              {/* Amount */}
              <div
                className="my-3 py-3 px-4 rounded-xl"
                style={isTetSeason ? {
                  background: 'rgba(255,255,255,0.85)',
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)',
                } : {
                  background: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #22c55e 100%)',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.5)',
                }}
              >
                <div
                  className={`text-3xl font-bold mb-1 ${isTetSeason ? 'text-gray-900' : 'text-white'}`}
                  style={isTetSeason ? {} : { textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                >
                  💰 {Number(data.amount).toLocaleString()} {data.tokenSymbol} 💰
                </div>

                <div className={`flex items-center justify-center gap-2 ${isTetSeason ? 'text-gray-700' : 'text-green-100'}`}>
                  <span>Từ</span>
                  <Avatar className="w-6 h-6 ring-2 ring-white/50">
                    <AvatarImage src={data.senderAvatarUrl || undefined} />
                    <AvatarFallback className={`text-xs ${isTetSeason ? 'bg-yellow-100 text-yellow-800' : 'bg-white text-green-600'}`}>
                      {data.senderUsername[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleClose(); navigate(`/profile/${data.senderId}`); }} className="font-bold hover:underline cursor-pointer">@{data.senderUsername}</button>
                  <span>với tình yêu thương 💚</span>
                </div>
              </div>

              {/* Message */}
              {data.message && (
                <div className={`backdrop-blur-sm rounded-xl p-3 text-left shadow-lg mb-3 ${isTetSeason ? 'bg-white/85 border border-yellow-300' : 'bg-white/80 border border-green-300'}`}>
                  <div className="flex items-start gap-3">
                    <MessageCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isTetSeason ? 'text-yellow-600' : 'text-green-600'}`} />
                    <p className={`italic text-lg ${isTetSeason ? 'text-gray-800' : 'text-green-800'}`}>"{data.message}"</p>
                  </div>
                </div>
              )}

              {/* Time */}
              <div className={`text-sm mb-3 ${isTetSeason ? 'text-white drop-shadow' : 'text-green-700'}`}>
                {format(new Date(data.createdAt), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3">
                <a href={getBscScanTxUrl(data.txHash, data.tokenSymbol)} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className={`gap-2 ${isTetSeason ? 'bg-white hover:bg-yellow-50 border-yellow-400 text-yellow-800' : 'bg-white hover:bg-green-50 border-green-400 text-green-800'}`}>
                    <ExternalLink className="w-4 h-4" />
                    Xem BSCScan
                  </Button>
                </a>
                <Button size="sm" className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0" onClick={handleSendThanks}>
                  <Heart className="w-4 h-4" />
                  Gửi Lời Cảm Ơn
                </Button>
                <Button variant="outline" size="sm" className={`gap-2 ${isTetSeason ? 'bg-white hover:bg-yellow-50 border-yellow-400 text-yellow-800' : 'bg-white hover:bg-green-50 border-green-400 text-green-800'}`} onClick={handleClose}>
                  <X className="w-4 h-4" />
                  Đóng
                </Button>
              </div>

              <div className={`mt-4 text-xs font-medium ${isTetSeason ? 'text-yellow-200 drop-shadow' : 'text-green-600'}`}>
                💚 FUN Profile • Mạnh Thường Quân 💚
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
