import { useState, useEffect } from 'react';
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
  Gift,
  Heart,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { playReceivedNotificationSound } from '@/lib/celebrationSounds';
import { useNavigate } from 'react-router-dom';

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

  // Play notification sound when card opens
  useEffect(() => {
    if (isOpen) {
      playReceivedNotificationSound();
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsCelebrationActive(false);
    onClose();
  };

  const handleSendThanks = () => {
    handleClose();
    // Navigate to chat with sender
    navigate(`/chat?userId=${data.senderId}`);
  };

  return (
    <>
      <DonationCelebration isActive={isOpen && isCelebrationActive} />
      
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent 
          className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden"
        >
          <div
            className="relative rounded-2xl overflow-hidden animate-glow-radiate"
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 30%, #bbf7d0 70%, #86efac 100%)',
            }}
          >
            {/* Radiant green border effect */}
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
                  <Sparkles className="w-4 h-4 text-green-500" />
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="relative p-6 text-center">
              {/* Header with celebration emojis */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 text-green-600 text-lg font-bold mb-2">
                  🎉 💰 🎊 💰 🎉
                </div>
                <h2 className="text-2xl font-bold text-green-800 flex items-center justify-center gap-2 drop-shadow-sm">
                  <Gift className="w-7 h-7 text-green-600 animate-bounce" />
                  BẠN NHẬN ĐƯỢC QUÀ TẶNG!
                </h2>
              </div>

              {/* Amount display with radiant glow */}
              <div 
                className="my-6 py-5 px-6 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #22c55e 100%)',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.5)',
                }}
              >
                <div 
                  className="text-4xl font-bold text-white mb-2"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                >
                  💰 {Number(data.amount).toLocaleString()} {data.tokenSymbol} 💰
                </div>
                
                {/* Sender info */}
                <div className="flex items-center justify-center gap-2 text-green-100">
                  <span>Từ</span>
                  <Avatar className="w-6 h-6 ring-2 ring-white/50">
                    <AvatarImage src={data.senderAvatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-white text-green-600">
                      {data.senderUsername[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleClose(); navigate(`/profile/${data.senderId}`); }} className="font-bold hover:underline cursor-pointer">@{data.senderUsername}</button>
                  <span>với tình yêu thương 💚</span>
                </div>
              </div>

              {/* Message if exists */}
              {data.message && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-left border border-green-300 shadow-lg mb-4">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-green-800 italic text-lg">"{data.message}"</p>
                  </div>
                </div>
              )}

              {/* Time */}
              <div className="text-sm text-green-700 mb-4">
                {format(new Date(data.createdAt), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3">
                <a
                  href={getBscScanTxUrl(data.txHash, data.tokenSymbol)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 bg-white hover:bg-green-50 border-green-400 text-green-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Xem BSCScan
                  </Button>
                </a>
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
                  onClick={handleSendThanks}
                >
                  <Heart className="w-4 h-4" />
                  Gửi Lời Cảm Ơn
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white hover:bg-green-50 border-green-400 text-green-800"
                  onClick={handleClose}
                >
                  <X className="w-4 h-4" />
                  Đóng
                </Button>
              </div>

              {/* Footer branding */}
              <div className="mt-4 text-xs text-green-600 font-medium">
                💚 FUN Profile • Mạnh Thường Quân 💚
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
