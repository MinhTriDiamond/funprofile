import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedAuthForm } from '@/components/auth/UnifiedAuthForm';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Don't auto-redirect here - let UnifiedAuthForm handle new user setup
      if (event === 'SIGNED_IN' && session) {
        // Handled by UnifiedAuthForm callbacks
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-amber-50/20 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Static background - no blur for performance */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-100/40 rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-100/40 rounded-full" />
      </div>

      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher variant="full" />
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Branding */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            {/* LCP Image - fixed dimensions, eager loading, high priority */}
            <picture>
              <source 
                srcSet="/fun-profile-logo-40.webp 1x, /fun-profile-logo-128.webp 2x"
                type="image/webp"
              />
              <img 
                src="/fun-profile-logo-40.webp" 
                alt="FUN Profile" 
                width={64} 
                height={64}
                loading="eager"
                fetchPriority="high"
                decoding="sync"
                className="w-16 h-16 rounded-full shadow-lg" 
              />
            </picture>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 bg-clip-text text-transparent mb-4">
            {t('authBrandTitle')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            {t('authBrandDescription')}
          </p>
          
          {/* Feature highlights */}
          <div className="mt-8 space-y-3 hidden md:block">
            <FeatureItem icon="✉️" text="Email OTP - No password needed" />
            <FeatureItem icon="🦊" text="MetaMask Wallet Login" />
            <FeatureItem icon="🔐" text="Google Single Sign-On" />
            <FeatureItem icon="🔑" text="Classic Email & Password" />
            <FeatureItem icon="💎" text="Auto Soul NFT Minting" />
          </div>
        </div>

        {/* Right Side - Auth Form with fixed dimensions to prevent CLS */}
        <div className="w-full max-w-md mx-auto min-h-[520px]">
          <UnifiedAuthForm />
          
          <p className="text-center mt-6 text-sm text-muted-foreground">
            <strong>{t('authCreatePage')}</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

// Feature highlight component
const FeatureItem = ({ icon, text }: { icon: string; text: string }) => (
  <div className="flex items-center gap-3 text-muted-foreground">
    <span className="text-xl">{icon}</span>
    <span className="text-sm">{text}</span>
  </div>
);

export default Auth;