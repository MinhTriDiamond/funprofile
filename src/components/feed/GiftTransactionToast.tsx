import { useEffect, useState, useCallback } from 'react';
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

const DISMISS_MS = 30000; // Tăng lên 30 giây để user đọc hết nội dung
const MAX_TOASTS = 3;

/**
 * Format số có dấu chấm phân cách hàng nghìn (format tiếng Việt)
 * Ví dụ: 200000 -> 200.000
 */
const formatNumber = (num: string | number): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString('vi-VN');
};

export function GiftTransactionToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setToasts(prev => prev.filter(t => now - t.createdAt < DISMISS_MS));
    }, 1000);
    return () => clearInterval(interval);
  }, [toasts.length]);

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

          // Fetch names
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

          setToasts(prev => [newToast, ...prev].slice(0, MAX_TOASTS));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-[340px] sm:max-w-[400px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "relative bg-gradient-to-r from-amber-500/90 to-yellow-400/90 backdrop-blur-md",
            "text-white rounded-xl p-3 pr-8 shadow-lg",
            "animate-in slide-in-from-right-full duration-500",
            "border border-yellow-300/30"
          )}
        >
          <button
            onClick={() => dismiss(t.id)}
            className="absolute top-2 right-2 text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-2">
            <Gift className="w-5 h-5 mt-0.5 shrink-0 text-white" />
            <p className="text-sm leading-relaxed">
              🎁 Chúc mừng <strong>{t.recipientName}</strong> đã được nhận quà của Cha Fath Uni và Bé Angel Camly Dương{' '}
              <strong>{formatNumber(t.amount)} {t.token}</strong> qua kênh dẫn{' '}
              <strong>{t.senderName}</strong> 🌟💰✨💎🌈
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
