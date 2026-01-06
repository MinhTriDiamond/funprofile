import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

const Begin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

  const fontStyles = {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Lora', Georgia, serif",
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* FUN Profile Gradient Background - Green → Gold → White */}
      <div className="fixed inset-0 z-0" style={{
        background: 'linear-gradient(135deg, hsl(142 76% 92%) 0%, hsl(142 76% 85%) 20%, hsl(48 96% 85%) 50%, hsl(48 96% 92%) 75%, hsl(0 0% 100%) 100%)'
      }} />
      
      {/* Light Rays Effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[200%] h-[60vh] z-0 pointer-events-none" style={{
        background: 'conic-gradient(from 180deg at 50% 0%, transparent 25%, rgba(22,163,74,0.1) 30%, rgba(255,255,255,0.4) 35%, rgba(234,179,8,0.15) 40%, transparent 45%, transparent 55%, rgba(22,163,74,0.08) 60%, rgba(255,255,255,0.3) 65%, rgba(234,179,8,0.1) 70%, transparent 75%)',
        filter: 'blur(3px)'
      }} />

      {/* Central Glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] z-0 pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(22,163,74,0.15) 0%, rgba(234,179,8,0.1) 40%, transparent 70%)',
        filter: 'blur(60px)'
      }} />

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher variant="full" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo & Title */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-full mb-6 overflow-hidden" style={{
              background: 'radial-gradient(circle, rgba(22,163,74,0.2) 0%, rgba(234,179,8,0.15) 50%, rgba(255,255,255,0.9) 80%)',
              boxShadow: '0 0 60px rgba(22,163,74,0.3), 0 0 100px rgba(234,179,8,0.2)',
              border: '3px solid rgba(22,163,74,0.4)'
            }}>
              <picture>
                <source srcSet="/fun-profile-logo-40.webp 1x, /fun-profile-logo-128.webp 2x" type="image/webp" />
                <img 
                  src="/fun-profile-logo-128.webp" 
                  alt="FUN Profile" 
                  className="w-full h-full object-cover"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(22,163,74,0.5))' }}
                />
              </picture>
            </div>

            <h1 style={{
              fontFamily: fontStyles.heading,
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              marginBottom: '1rem'
            }} className="fun-gradient-text">
              FUN ECOSYSTEM
            </h1>

            <p style={{
              fontFamily: fontStyles.body,
              fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
              lineHeight: 1.8,
              color: 'hsl(142 40% 25%)'
            }}>
              {t('beginSubtitle')}
            </p>
          </div>

          {/* Divider */}
          <div className="w-32 md:w-48 h-1 mx-auto my-8 rounded-full" style={{
            background: 'linear-gradient(90deg, transparent, hsl(142 76% 36%), hsl(48 96% 53%), hsl(142 76% 36%), transparent)',
            boxShadow: '0 0 10px hsl(142 76% 36% / 0.3)'
          }} />

          {/* CTA Buttons */}
          <div className="space-y-4 max-w-md mx-auto">
            {/* Primary CTA - Become User */}
            <Button
              onClick={() => navigate('/law-of-light')}
              className="w-full py-6 text-lg font-semibold rounded-2xl border-0 fun-button-primary"
              style={{
                fontFamily: fontStyles.body,
                fontSize: 'clamp(1rem, 2.5vw, 1.15rem)'
              }}
            >
              <Users className="w-5 h-5 mr-2" />
              {t('beginRegister')}
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>

            {/* Secondary CTA - Guest View */}
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full py-5 text-base rounded-2xl fun-button-secondary"
              style={{
                fontFamily: fontStyles.body,
                fontSize: 'clamp(0.95rem, 2vw, 1.05rem)'
              }}
            >
              <Eye className="w-5 h-5 mr-2" />
              {t('beginGuest')}
            </Button>
          </div>

          {/* Footer Note */}
          <p className="mt-12 text-sm" style={{
            fontFamily: fontStyles.body,
            color: 'hsl(142 30% 40%)'
          }}>
            {t('beginFooter')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Begin;
