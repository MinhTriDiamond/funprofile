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
import { ExternalLink, X, Camera } from 'lucide-react';
import funPlayLogo from '@/assets/fun-profile-logo.png';
import { RichTextOverlay } from './RichTextOverlay';
import { playCelebrationMusicLoop } from '@/lib/celebrationSounds';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export interface DonationReceivedData {
  id: string;
  amount: string;
  tokenSymbol: string;
  senderUsername: string;
  senderAvatarUrl?: string | null;
  senderId: string;
  recipientUsername?: string;
  recipientAvatarUrl?: string | null;
  message?: string | null;
  txHash: string;
  createdAt: string;
  status?: string;
  lightScoreEarned?: number;
}

interface DonationReceivedCardProps {
  isOpen: boolean;
  onClose: () => void;
  data: DonationReceivedData;
}

const TOKEN_ICON: Record<string, string> = {
  CAMLY: '⭐',
  USDT: '💵',
  BNB: '🔶',
  BTCB: '₿',
  FUN: '✨',
};

export const DonationReceivedCard = ({
  isOpen,
  onClose,
  data,
}: DonationReceivedCardProps) => {
  const [isCelebrationActive, setIsCelebrationActive] = useState(true);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      audioRef.current = playCelebrationMusicLoop('rich-3');
      if (audioRef.current) {
        audioRef.current.loop = false;
      }
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
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `donation-${data.id?.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Đã lưu hình!');
    } catch {
      toast.error('Không thể lưu hình');
    }
  };

  const shortTxHash = data.txHash
    ? `${data.txHash.slice(0, 10)}...${data.txHash.slice(-7)}`
    : '';

  const lightScore = (data as any).lightScoreEarned || 0;

  const amountDisplay = Number(data.amount).toLocaleString('vi-VN');

  return (
    <>
      <DonationCelebration isActive={isOpen && isCelebrationActive} showRichText={false} />
      {isOpen && <RichTextOverlay />}

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="max-w-[420px] w-[94vw] p-0 overflow-hidden border-0 shadow-2xl [&>button]:hidden !z-[10002]"
          overlayClassName="!z-[10002]"
        >
          <div
            ref={cardRef}
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #16a34a 0%, #15803d 40%, #166534 100%)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {/* Logo */}
            <div className="flex justify-center pt-5 pb-1">
              <img
                src={funPlayLogo}
                alt="FUN Profile"
                className="w-14 h-14 rounded-full object-cover ring-2 ring-white/40"
              />
            </div>

            {/* Title */}
            <div className="text-center px-5 pb-4">
              <h2 className="text-lg font-extrabold leading-snug"
                style={{ color: '#fde047', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                🎉✨ Chúc Mừng Bạn Vừa Được<br />
                Đón Nhận Phước Lành Của Cha Và<br />
                Bé Angel CamLy ! ✨🎉
              </h2>
            </div>

            {/* Amount box */}
            <div className="mx-4 mb-3 rounded-2xl py-4 text-center"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
              <div className="text-4xl font-black text-white tracking-tight">
                {TOKEN_ICON[data.tokenSymbol] || '💰'} {amountDisplay} {data.tokenSymbol}
              </div>
              <div className="text-sm mt-1" style={{ color: '#fde047' }}>
                ⭐
              </div>
              <div className="text-xs mt-0.5 text-green-100 italic">
                ≈ Priceless với tình yêu thương 💛
              </div>
            </div>

            {/* Info list */}
            <div className="mx-4 mb-3 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>

              {/* Người tặng */}
              <div className="flex items-start gap-3 px-4 py-3 border-b border-white/10">
                <span className="text-sm shrink-0 mt-0.5">👤</span>
                <span className="text-xs font-semibold text-green-100 w-20 shrink-0 mt-0.5">Người tặng:</span>
                <button
                  type="button"
                  onClick={() => { handleClose(); navigate(`/profile/${data.senderId}`); }}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="w-5 h-5 shrink-0">
                    <AvatarImage src={data.senderAvatarUrl || undefined} />
                    <AvatarFallback className="text-[9px] bg-green-300 text-green-900 font-bold">
                      {data.senderUsername?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold text-white underline-offset-2 hover:underline">
                    @{data.senderUsername}
                  </span>
                </button>
              </div>

              {/* Người nhận */}
              {data.recipientUsername && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                  <span className="text-sm shrink-0">🎯</span>
                  <span className="text-xs font-semibold text-green-100 w-20 shrink-0">Người nhận:</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5 shrink-0">
                      <AvatarImage src={data.recipientAvatarUrl || undefined} />
                      <AvatarFallback className="text-[9px] bg-yellow-300 text-yellow-900 font-bold">
                        {data.recipientUsername?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-bold text-white">@{data.recipientUsername}</span>
                  </div>
                </div>
              )}

              {/* Lời nhắn */}
              {data.message && (
                <div className="flex items-start gap-3 px-4 py-3 border-b border-white/10">
                  <span className="text-sm shrink-0 mt-0.5">💬</span>
                  <span className="text-xs font-semibold text-green-100 w-20 shrink-0 mt-0.5">Lời nhắn:</span>
                  <p className="text-xs text-white/90 italic leading-relaxed flex-1">
                    "{data.message}"
                  </p>
                </div>
              )}

              {/* Thời gian */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <span className="text-sm shrink-0">🕐</span>
                <span className="text-xs font-semibold text-green-100 w-20 shrink-0">Thời gian:</span>
                <span className="text-xs text-white font-mono">
                  {format(new Date(data.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                </span>
              </div>

              {/* TX Hash */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm shrink-0">🔗</span>
                <span className="text-xs font-semibold text-green-100 w-20 shrink-0">TX Hash:</span>
                <a
                  href={getBscScanTxUrl(data.txHash, data.tokenSymbol)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-yellow-300 hover:text-yellow-100 flex items-center gap-1 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {shortTxHash}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Light Score */}
            {lightScore > 0 && (
              <div className="mx-4 mb-3 rounded-xl py-2.5 text-center"
                style={{ background: 'rgba(253, 224, 71, 0.15)', border: '1px solid rgba(253,224,71,0.3)' }}>
                <span className="text-xs font-bold" style={{ color: '#fde047' }}>
                  +{lightScore} Light Score được cộng vào hồ sơ của bạn! 🌟
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="mx-4 mb-4 flex gap-2">
              <a
                href={getBscScanTxUrl(data.txHash, data.tokenSymbol)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Xem BSCScan
                </Button>
              </a>
              <Button
                size="sm"
                className="flex-1 gap-1.5 text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                onClick={handleSaveImage}
              >
                <Camera className="w-3.5 h-3.5" />
                Lưu Hình
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold px-4"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                onClick={handleClose}
              >
                <X className="w-3.5 h-3.5" />
                Đóng
              </Button>
            </div>

            {/* Footer */}
            <div className="text-center pb-4 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              🎆 FUN Profile • Mạnh Thưởng Quân 🎆
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
