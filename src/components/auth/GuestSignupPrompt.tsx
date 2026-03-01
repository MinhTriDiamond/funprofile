import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

/**
 * GuestSignupPrompt
 * 
 * Popup gợi ý đăng ký khi Khách muốn tương tác (comment, like, post).
 * Hiển thị giữa trang – không chặn trải nghiệm đọc/xem cơ bản.
 * 
 * Usage:
 *   const { promptGuest } = useGuestPrompt();
 *   // In any interaction handler:
 *   if (!currentUserId) { promptGuest(); return; }
 */

interface GuestSignupPromptProps {
  open: boolean;
  onClose: () => void;
}

export const GuestSignupPrompt = ({ open, onClose }: GuestSignupPromptProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const isVietnamese = language === 'vi';

  const handleRegister = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-2 border-primary/30 bg-background/95 backdrop-blur-sm">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center py-4">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img
              src="/fun-profile-logo-128.webp"
              alt="FUN Profile"
              className="w-20 h-20 rounded-full"
              style={{
                border: '3px solid transparent',
                background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #166534, #22c55e, #15803d) border-box',
              }}
            />
          </div>

          {/* Title */}
          <h2
            className="text-2xl font-bold mb-6"
            style={{
              background: 'linear-gradient(135deg, #166534 0%, #22c55e 30%, #15803d 50%, #22c55e 70%, #166534 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {isVietnamese ? 'VUI LÒNG ĐĂNG KÝ ĐỂ' : 'PLEASE REGISTER FOR'}
          </h2>

          {/* Benefits list */}
          <div className="space-y-3 mb-8">
            {isVietnamese ? (
              <>
                <BenefitItem emoji="🌼" text="ĐƯỢC CHƠI" />
                <BenefitItem emoji="📚" text="ĐƯỢC HỌC" />
                <BenefitItem emoji="📲" text="ĐƯỢC VỌC" />
                <BenefitItem emoji="🧧" text="ĐƯỢC LÌ XÌ" />
              </>
            ) : (
              <>
                <BenefitItem emoji="💰" text="USE & EARN" />
                <BenefitItem emoji="💵" text="LEARN & EARN" />
                <BenefitItem emoji="🏅" text="GIVE & GAIN" />
                <BenefitItem emoji="🏆" text="REVIEW & REWARD" />
              </>
            )}
          </div>

          {/* Register button with rainbow border */}
          <div
            className="relative p-[3px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3, #FF0000)',
              boxShadow: '0 0 15px rgba(255, 0, 0, 0.15), 0 0 15px rgba(0, 255, 0, 0.15), 0 0 15px rgba(0, 0, 255, 0.15)',
            }}
          >
            <Button
              onClick={handleRegister}
              className="w-full h-12 text-lg font-bold rounded-full bg-white hover:bg-slate-50 border-0"
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #166534 0%, #22c55e 30%, #15803d 50%, #22c55e 70%, #166534 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {isVietnamese ? 'ĐĂNG KÝ NGAY' : 'REGISTER NOW'}
              </span>
            </Button>
          </div>

          {/* Skip option */}
          <button
            onClick={onClose}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isVietnamese ? 'Để sau, tiếp tục xem' : 'Maybe later, continue browsing'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BenefitItem = ({ emoji, text }: { emoji: string; text: string }) => (
  <div className="flex items-center justify-center gap-3">
    <span className="text-2xl">{emoji}</span>
    <span className="text-lg font-semibold text-foreground">{text}</span>
  </div>
);

/**
 * Hook for components to trigger the guest signup prompt.
 * Returns { isGuest, promptGuest, GuestPrompt }
 */
export function useGuestPrompt() {
  const [isGuest, setIsGuest] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsGuest(!session);
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsGuest(false);
      } else if (event === 'SIGNED_OUT') {
        setIsGuest(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const promptGuest = () => {
    if (isGuest) {
      setShowPrompt(true);
      return true; // was guest, prompt shown
    }
    return false; // not guest, continue normally
  };

  const GuestPrompt = () => (
    <GuestSignupPrompt open={showPrompt} onClose={() => setShowPrompt(false)} />
  );

  return { isGuest, promptGuest, GuestPrompt };
}
