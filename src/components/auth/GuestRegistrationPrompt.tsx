import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { Sparkles, X } from 'lucide-react';

interface GuestRegistrationPromptProps {
  open: boolean;
  onClose: () => void;
  triggerSource: 'scroll' | 'interaction';
}

export const GuestRegistrationPrompt = ({ open, onClose, triggerSource }: GuestRegistrationPromptProps) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const handleRegister = () => {
    onClose();
    navigate('/law-of-light');
  };

  const isVi = language === 'vi';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md mx-auto border-0 p-0 gap-0 bg-transparent shadow-none [&>button]:hidden">
        <div 
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #166534 0%, #22c55e 25%, #15803d 50%, #22c55e 75%, #166534 100%)',
            padding: '3px',
          }}
        >
          <div className="bg-card/95 backdrop-blur-sm rounded-[21px] p-6 relative">
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors z-10"
            >
              <X size={16} className="text-muted-foreground" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg">
                <Sparkles className="text-primary-foreground" size={28} />
              </div>
            </div>

            {/* Title */}
            <h2 
              className="text-2xl font-bold text-center mb-5"
              style={{
                background: 'linear-gradient(135deg, #166534 0%, #22c55e 30%, #15803d 50%, #22c55e 70%, #166534 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {isVi ? 'VUI LÒNG ĐĂNG KÝ ĐỂ' : 'PLEASE REGISTER FOR'}
            </h2>

            {/* Benefits list */}
            <div className="space-y-2.5 mb-6">
              {isVi ? (
                <>
                  <BenefitRow emoji="🌼" text="Được Chơi" />
                  <BenefitRow emoji="📚" text="Được Học" />
                  <BenefitRow emoji="📲" text="Được Vọc" />
                  <BenefitRow emoji="🧧" text="Được Lì Xì" />
                </>
              ) : (
                <>
                  <BenefitRow emoji="💰" text="Use & Earn" />
                  <BenefitRow emoji="💵" text="Learn & Earn" />
                  <BenefitRow emoji="🏅" text="Give & Gain" />
                  <BenefitRow emoji="🏆" text="Review & Reward" />
                </>
              )}
            </div>

            {/* CTA */}
            <Button 
              onClick={handleRegister}
              className="w-full h-12 text-base font-bold rounded-full shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #166534 0%, #22c55e 50%, #15803d 100%)',
                color: 'white',
              }}
            >
              {isVi ? '✨ Đăng Ký Ngay' : '✨ Register Now'}
            </Button>

            {/* Skip */}
            {triggerSource === 'scroll' && (
              <button 
                onClick={onClose}
                className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                {isVi ? 'Để sau' : 'Maybe later'}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BenefitRow = ({ emoji, text }: { emoji: string; text: string }) => (
  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/50 border border-border/50">
    <span className="text-xl">{emoji}</span>
    <span className="text-base font-semibold text-foreground">{text}</span>
  </div>
);
