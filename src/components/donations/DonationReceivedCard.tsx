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
import { vi, enUS } from 'date-fns/locale';
import {
  ExternalLink,
  Heart,
  Copy,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import funPlayLogo from '@/assets/fun-profile-logo.png';
import camlyLogo from '@/assets/tokens/camly-coin-rainbow.png';
import { RichTextOverlay } from './RichTextOverlay';
import { playCelebrationMusic } from '@/lib/celebrationSounds';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

export interface DonationReceivedData {
  id: string;
  amount: string;
  tokenSymbol: string;
  senderUsername: string;
  senderDisplayName?: string | null;
  senderAvatarUrl?: string | null;
  senderId: string;
  recipientUsername?: string;
  recipientDisplayName?: string | null;
  recipientAvatarUrl?: string | null;
  message?: string | null;
  txHash: string;
  createdAt: string;
  status?: string;
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
  const { t, language } = useLanguage();
  const [isCelebrationActive, setIsCelebrationActive] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dateLocale = language === 'vi' ? vi : enUS;
  const numLocale = language === 'vi' ? 'vi-VN' : 'en-US';

  useEffect(() => {
    if (isOpen) {
      audioRef.current = playCelebrationMusic('rich-1');
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

  const handleCopyLink = () => {
    const link = getBscScanTxUrl(data.txHash, data.tokenSymbol);
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shortTxHash = data.txHash
    ? `${data.txHash.slice(0, 10)}...${data.txHash.slice(-8)}`
    : '';

  const statusLabel = data.status === 'completed' || data.status === 'confirmed' || !data.status
    ? t('statusSuccess')
    : data.status === 'pending'
    ? t('statusProcessing')
    : data.status;

  const isSuccess = !data.status || data.status === 'completed' || data.status === 'confirmed';

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
          <div className="bg-white rounded-2xl overflow-y-auto flex-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <div className="px-5 pt-6 pb-3 text-center relative bg-white">
              <div className="flex justify-center mb-2">
                <img src={funPlayLogo} alt="FUN Profile" className="w-14 h-14 rounded-full object-cover shadow-md" style={{ boxShadow: '0 0 0 3px #d1fae5, 0 0 0 5px #6ee7b7' }} />
              </div>
              <div className="text-xs font-extrabold mb-0.5 tracking-wide" style={{ color: '#047857' }}>{t('donationReceiptHeader')}</div>
              <div className="text-[10px] font-mono" style={{ color: '#059669' }}>#{data.id?.slice(0, 16)}</div>
            </div>

            <div className="mx-4 border-t border-dashed border-gray-200 my-1" />

            <div
              className="mx-4 mt-3 rounded-xl px-4 py-2.5 text-center"
              style={{ background: 'linear-gradient(135deg, #fff5f7 0%, #ffe8ef 100%)', border: '1px solid #ffc9d9' }}
            >
              <div className="text-sm font-extrabold text-pink-700 mb-0.5 uppercase tracking-wide">{t('giftBannerTitle')}</div>
              <div className="text-xs font-semibold text-pink-500">{t('giftBannerSubtitle')}</div>
            </div>

            <div className="mx-4 mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => { handleClose(); navigate(`/profile/${data.senderId}`); }}
                className="flex flex-col items-center gap-1.5 flex-1 hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-14 h-14" style={{ boxShadow: '0 0 0 2.5px #fca5a5' }}>
                  <AvatarImage src={data.senderAvatarUrl || undefined} />
                  <AvatarFallback className="bg-rose-50 text-rose-500 font-bold text-sm">
                    {(data.senderDisplayName || data.senderUsername)?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <div className="text-xs font-extrabold leading-tight" style={{ color: '#047857' }}>{data.senderDisplayName || data.senderUsername}</div>
                  <div className="text-[10px] font-medium" style={{ color: '#059669' }}>@{data.senderUsername}</div>
                </div>
              </button>

              <div className="flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}>
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 flex-1">
                <Avatar className="w-14 h-14" style={{ boxShadow: '0 0 0 2.5px #6ee7b7' }}>
                  <AvatarImage src={data.recipientAvatarUrl || undefined} />
                  <AvatarFallback className="bg-emerald-50 text-emerald-600 font-bold text-sm">
                    {(data.recipientDisplayName || data.recipientUsername || 'Me')?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <div className="text-xs font-extrabold leading-tight" style={{ color: '#047857' }}>{data.recipientDisplayName || data.recipientUsername || t('youLabel')}</div>
                  <div className="text-[10px] font-medium" style={{ color: '#059669' }}>@{data.recipientUsername || 'you'}</div>
                </div>
              </div>
            </div>

            <div className="mx-4 mt-4 text-center py-4">
              <div className="flex items-center justify-center gap-2">
                {data.tokenSymbol === 'CAMLY' ? (
                  <img src={camlyLogo} alt="CAMLY" className="w-9 h-9 object-contain" />
                ) : (
                  <span className="text-3xl">💰</span>
                )}
                <span
                  className="text-[34px] font-black tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 40%, #34d399 80%, #6ee7b7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 6px rgba(16,185,129,0.5))',
                  }}
                >
                  {Number(data.amount).toLocaleString(numLocale, { minimumFractionDigits: 0, maximumFractionDigits: 8 })} {data.tokenSymbol}
                </span>
              </div>
              {data.message && (
                <div className="mt-2 text-xs font-semibold italic px-3" style={{ color: '#047857' }}>
                  "{data.message}"
                </div>
              )}
            </div>

            <div className="mx-4 border-t border-dashed border-gray-200 my-1" />

            <div className="mx-4 mt-2 rounded-xl overflow-hidden border border-gray-100">
              <div className="divide-y divide-gray-100">
                <div className="flex justify-between items-center px-4 py-2.5 bg-white">
                  <span className="text-xs font-semibold" style={{ color: '#047857' }}>{t('timeLabel')}</span>
                  <span className="text-xs font-bold" style={{ color: '#064e3b' }}>
                    {format(new Date(data.createdAt), 'HH:mm dd/MM/yyyy', { locale: dateLocale })}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-white">
                  <span className="text-xs font-semibold" style={{ color: '#047857' }}>{t('networkLabel')}</span>
                  <span className="text-xs font-bold" style={{ color: '#064e3b' }}>{data.tokenSymbol === 'BTC' ? 'BTC' : 'BSC'}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-white">
                  <span className="text-xs font-semibold" style={{ color: '#047857' }}>TX Hash</span>
                  <a
                    href={getBscScanTxUrl(data.txHash, data.tokenSymbol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono font-bold flex items-center gap-1"
                    style={{ color: '#059669' }}
                  >
                    {shortTxHash}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-white">
                  <span className="text-xs font-semibold" style={{ color: '#047857' }}>{t('statusLabel')}</span>
                  <span className={`text-xs font-bold flex items-center gap-1 ${isSuccess ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {isSuccess
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : <Clock className="w-3.5 h-3.5" />}
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="mx-4 mt-3 rounded-xl px-4 py-2.5 text-center"
              style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}
            >
              <div className="text-sm font-extrabold text-amber-800">
                {t('abundanceHappiness')}
              </div>
            </div>

            <div className="mx-4 mt-4 mb-5 space-y-2">
              <Button
                size="sm"
                className="w-full gap-2 rounded-full text-white font-bold"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)', boxShadow: '0 3px 10px rgba(4,78,59,0.45)' }}
                onClick={handleClose}
              >
                <ArrowLeft className="w-4 h-4" />
                {t('goBackBtn')}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 text-xs rounded-full"
                  onClick={handleCopyLink}
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t('copiedLinkLabel') : t('copyLinkLabel')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs font-bold border-gray-300 text-gray-600 hover:bg-gray-50 rounded-full"
                  onClick={handleSendThanks}
                >
                  <Heart className="w-3.5 h-3.5" />
                  {t('sendThanksBtn')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
