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
  MessageCircle,
  Clock,
  Link2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import funPlayLogo from '@/assets/fun-profile-logo.png';
import { RichTextOverlay } from './RichTextOverlay';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { playCelebrationMusicLoop } from '@/lib/celebrationSounds';

export interface DonationCardData {
  id: string;
  amount: string;
  tokenSymbol: string;
  senderUsername: string;
  senderAvatarUrl?: string | null;
  senderId?: string;
  recipientUsername: string;
  recipientAvatarUrl?: string | null;
  recipientId?: string;
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

const TOKEN_ICON: Record<string, string> = {
  CAMLY: '🪙',
  USDT: '💵',
  BNB: '🔶',
  BTCB: '₿',
  FUN: '✨',
};

export const DonationSuccessCard = ({
  isOpen,
  onClose,
  data,
}: DonationSuccessCardProps) => {
  const [isCelebrationActive, setIsCelebrationActive] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);
    try {
      const buttons = cardRef.current.querySelector('[data-action-buttons]');
      if (buttons) buttons.classList.add('opacity-0');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
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

  const handleCopyTx = () => {
    const link = getBscScanTxUrl(data.txHash, data.tokenSymbol);
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shortTxHash = data.txHash
    ? `${data.txHash.slice(0, 10)}...${data.txHash.slice(-8)}`
    : '';

  return (
    <>
      <DonationCelebration isActive={isOpen && isCelebrationActive} showRichText={false} />
      {isOpen && <RichTextOverlay />}

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="max-w-[400px] w-[92vw] p-0 border-0 shadow-2xl [&>button]:hidden !z-[10002] overflow-hidden"
          overlayClassName="!z-[10002]"
          style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        >
          <div ref={cardRef} className="bg-white rounded-2xl overflow-y-auto flex-1" style={{ fontFamily: 'system-ui, sans-serif' }}>

            {/* Header — white */}
            <div className="px-5 pt-6 pb-3 text-center bg-white">
              <div className="flex justify-center mb-2">
                <img src={funPlayLogo} alt="FUN Profile" className="w-14 h-14 rounded-full object-cover shadow-md" style={{ boxShadow: '0 0 0 3px #d1fae5, 0 0 0 5px #6ee7b7' }} />
              </div>
              <div className="text-sm font-bold text-gray-800 mb-0.5 tracking-wide">FUN Profile — Biên Nhận Tặng</div>
              <div className="text-xs text-gray-400 font-mono">#{data.id?.slice(0, 16)}</div>
              <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'linear-gradient(90deg, #ff6b9d, #ff9a5c)', color: '#fff' }}>
                🎆 Chúc Mừng Năm Mới 🎆
              </div>
            </div>

            {/* Dashed divider */}
            <div className="mx-4 border-t border-dashed border-gray-200 my-1" />

            {/* Tet greeting banner */}
            <div
              className="mx-4 mt-3 rounded-xl px-4 py-2.5 text-center"
              style={{ background: 'linear-gradient(135deg, #fff5f7 0%, #ffe8ef 100%)', border: '1px solid #ffc9d9' }}
            >
              <div className="text-sm font-bold text-pink-600 mb-0.5">🌸 Chúc Mừng Năm Mới 2026 🌸</div>
              <div className="text-xs text-pink-400">Phúc Lộc An Khang — Vạn Sự Như Ý</div>
            </div>

            {/* Sender → Recipient — horizontal like image-341 */}
            <div className="mx-4 mt-4 flex items-center justify-between gap-2">
              {/* Sender */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <Avatar className="w-12 h-12" style={{ boxShadow: '0 0 0 2px #fca5a5' }}>
                  <AvatarImage src={data.senderAvatarUrl || undefined} />
                  <AvatarFallback className="bg-rose-50 text-rose-500 font-bold text-sm">
                    {data.senderUsername?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-800 leading-tight">{data.senderUsername}'s</div>
                  <div className="text-xs font-semibold text-gray-700 leading-tight">Channel</div>
                  <div className="text-xs text-gray-400">@{data.senderUsername}</div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', boxShadow: '0 1px 4px rgba(16,185,129,0.25)' }}>
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                </div>
              </div>

              {/* Recipient */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <Avatar className="w-12 h-12" style={{ boxShadow: '0 0 0 2px #6ee7b7' }}>
                  <AvatarImage src={data.recipientAvatarUrl || undefined} />
                  <AvatarFallback className="bg-emerald-50 text-emerald-600 font-bold text-sm">
                    {data.recipientUsername?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-800 leading-tight">{data.recipientUsername}'s</div>
                  <div className="text-xs font-semibold text-gray-700 leading-tight">Channel</div>
                  <div className="text-xs text-gray-400">@{data.recipientUsername}</div>
                </div>
              </div>
            </div>

            {/* Amount — metallic green on white */}
            <div className="mx-4 mt-4 text-center py-4">
              <div
                className="text-4xl font-black tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 1px 2px rgba(16,185,129,0.3))',
                }}
              >
                {TOKEN_ICON[data.tokenSymbol] || '💰'}{' '}
                {Number(data.amount).toLocaleString('vi-VN')} {data.tokenSymbol}
              </div>
              <div className="text-xs text-gray-400 mt-1">≈ Priceless với tình yêu thương 💛</div>
              {data.message && (
                <div className="mt-2 text-xs text-gray-400 italic px-3">
                  "{data.message}"
                </div>
              )}
            </div>

            {/* Dashed divider */}
            <div className="mx-4 border-t border-dashed border-gray-200 my-1" />

            {/* Details table */}
            <div className="mx-4 mt-2 rounded-xl overflow-hidden border border-gray-100">
              <div className="divide-y divide-gray-100">
                <div className="flex justify-between items-center px-4 py-2.5 bg-white">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Thời gian</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {format(new Date(data.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-white">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />TX Hash</span>
                  <a
                    href={getBscScanTxUrl(data.txHash, data.tokenSymbol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    {shortTxHash}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-white">
                  <span className="text-xs text-gray-400 font-medium">Mạng</span>
                  <span className="text-xs font-semibold text-gray-700">BSC</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-white">
                  <span className="text-xs text-gray-400 font-medium">Trạng thái</span>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Thành công
                  </span>
                </div>
              </div>
            </div>

            {/* Light Score */}
            {data.lightScoreEarned > 0 && (
              <div className="mx-4 mt-3 rounded-xl px-4 py-2.5 text-center"
                style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid #6ee7b7' }}>
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Sparkles className="w-3.5 h-3.5" />
                  +{data.lightScoreEarned} Light Score được cộng vào hồ sơ! ✨
                </div>
              </div>
            )}

            {/* Footer amber */}
            <div
              className="mx-4 mt-3 rounded-xl px-4 py-2.5 text-center"
              style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}
            >
              <div className="text-xs font-bold text-amber-700">🧧 Phúc Lộc Thọ — FUN Profile 🧧</div>
              <div className="text-xs text-amber-500 mt-0.5">Tết Nguyên Đán 2026 — Năm Bính Ngọ</div>
            </div>

            {/* Action buttons */}
            <div data-action-buttons className="mx-4 mt-4 mb-5 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 border-gray-200 text-gray-500 hover:bg-gray-50 text-xs rounded-full"
                onClick={handleCopyTx}
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép!' : 'Sao chép TX'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 border-gray-200 text-gray-500 hover:bg-gray-50 text-xs rounded-full"
                onClick={handleSaveImage}
                disabled={isSaving}
              >
                <Camera className="w-3.5 h-3.5" />
                {isSaving ? 'Đang lưu...' : 'Lưu Hình'}
              </Button>
              <Button
                size="sm"
                className="px-3 border-0 rounded-full text-white"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)', boxShadow: '0 2px 8px rgba(16,185,129,0.4)' }}
                onClick={handleClose}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
