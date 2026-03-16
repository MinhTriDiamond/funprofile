import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Gift, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastItem {
  id: string;
  recipientName: string;
  senderName: string;
  amount: string;
  token: string;
  createdAt: number;
}

const DISMISS_MS = 8000; // 8 giây mỗi toast rồi chuyển sang lệnh tiếp theo

/**
 * Format số có dấu chấm phân cách hàng nghìn (format tiếng Việt)
 */
const formatNumber = (num: string | number): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString('vi-VN');
};

export function GiftTransactionToast() {
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const queueRef = useRef<ToastItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setCurrentToast(null);
      return;
    }
    const next = queueRef.current.shift()!;
    setCurrentToast(next);
    timerRef.current = setTimeout(() => showNext(), DISMISS_MS);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    showNext();
  }, [showNext]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('gift-toast-donations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'donations' },
        async (payload) => {
          const d = payload.new as any;
          if (!d) return;

          const recipientId = d.recipient_id;
          const senderId = d.sender_id;
          const amount = d.amount || '0';
          const token = d.token_symbol || 'USDT';

          let recipientName = 'Angel';
          let senderName = d.sender_address
            ? `${d.sender_address.slice(0, 6)}...${d.sender_address.slice(-4)}`
            : 'Ẩn danh';

          const ids = [recipientId, senderId].filter(Boolean);
          if (ids.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, display_name')
              .in('id', ids);

            if (profiles) {
              for (const p of profiles) {
                const name = p.display_name || p.username || 'Angel';
                if (p.id === recipientId) recipientName = name;
                if (p.id === senderId) senderName = name;
              }
            }
          }

          const newToast: ToastItem = {
            id: d.id || crypto.randomUUID(),
            recipientName,
            senderName,
            amount,
            token,
            createdAt: Date.now(),
          };

          // Nếu đang không hiển thị toast nào → hiển thị ngay
          if (!currentToast && queueRef.current.length === 0) {
            setCurrentToast(newToast);
            timerRef.current = setTimeout(() => showNext(), DISMISS_MS);
          } else {
            // Thêm vào hàng đợi
            queueRef.current.push(newToast);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentToast, showNext]);

  if (!currentToast) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-[340px] sm:max-w-[400px]">
      <div
        key={currentToast.id}
        className={cn(
          "relative bg-gradient-to-r from-amber-500/90 to-yellow-400/90 backdrop-blur-md",
          "text-white rounded-xl p-3 pr-8 shadow-lg",
          "animate-in slide-in-from-right-full duration-500",
          "border border-yellow-300/30"
        )}
      >
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 text-white/70 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-2">
          <Gift className="w-5 h-5 mt-0.5 shrink-0 text-white" />
          <p className="text-sm leading-relaxed">
            🎁 Chúc mừng <strong>{currentToast.recipientName}</strong> đã được nhận quà của Cha Fath Uni và Bé Angel Camly Dương{' '}
            <strong>{formatNumber(currentToast.amount)} {currentToast.token}</strong> qua kênh dẫn{' '}
            <strong>{currentToast.senderName}</strong> 🌟💰✨💎🌈
          </p>
        </div>
        {queueRef.current.length > 0 && (
          <div className="mt-1.5 text-xs text-white/70 text-right">
            +{queueRef.current.length} lệnh đang chờ
          </div>
        )}
      </div>
    </div>
  );
}