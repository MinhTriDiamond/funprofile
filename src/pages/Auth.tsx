import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedAuthForm } from '@/components/auth/UnifiedAuthForm';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { Eye } from 'lucide-react';

const ECOSYSTEM_PLATFORMS = [
  { name: 'FUN Profile', logo: '/fun-profile-logo-40.webp' },
  { name: 'Angel AI', logo: '/angel-ai-logo-36.png' },
  { name: 'FUN Play', logo: '/fun-play-logo-36.webp' },
  { name: 'FUN Academy', logo: '/fun-academy-logo-36.webp' },
  { name: 'Green Earth', logo: '/green-earth-logo-36.webp' },
  { name: 'FUN Planet', logo: '/fun-planet-logo-36.webp' },
  { name: 'FUN Farm', logo: '/fun-farm-logo-36.webp' },
  { name: 'FUN Charity', logo: '/fun-charity-logo-36.webp' },
  { name: 'FUN Life', logo: '/fun-life-logo-36.webp' },
];

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [ssoRedirecting, setSsoRedirecting] = useState(false);
  
  const returnTo = searchParams.get('return_to');
  const ssoFlow = searchParams.get('sso_flow') === 'true';
  const isSsoMode = ssoFlow && !!returnTo;

  useEffect(() => {
    const checkBanStatus = async (userId: string): Promise<boolean> => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', userId)
        .single();
      return profile?.is_banned === true;
    };

    const checkUser = async () => {
      // If URL hash contains type=recovery, don't auto-redirect — let ResetPassword page handle it
      const hash = window.location.hash;
      if (hash.includes('type=recovery')) {
        navigate('/reset-password', { replace: true });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const banned = await checkBanStatus(session.user.id);
        if (banned) {
          await supabase.auth.signOut();
          return;
        }
        if (ssoFlow && returnTo) {
          handleSSORedirect(session.access_token);
        } else {
          navigate('/');
        }
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
        return;
      }
      if (event === 'SIGNED_IN' && session) {
        const banned = await checkBanStatus(session.user.id);
        if (banned) {
          await supabase.auth.signOut();
          return;
        }
        if (ssoFlow && returnTo) {
          handleSSORedirect(session.access_token);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, ssoFlow, returnTo]);

  const handleSSORedirect = (accessToken: string) => {
    if (!returnTo) return;
    setSsoRedirecting(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      fetch(returnTo, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      })
        .then(res => res.json())
        .then(data => {
          clearTimeout(timeoutId);
          if (data.redirect_uri) {
            window.location.href = data.redirect_uri;
          } else if (data.error) {
            console.error('SSO authorize error:', data);
            setSsoRedirecting(false);
            navigate('/');
          }
        })
        .catch(err => {
          clearTimeout(timeoutId);
          console.error('SSO redirect error:', err);
          setSsoRedirecting(false);
          navigate('/');
        });
    } catch (err) {
      console.error('Invalid return_to URL:', err);
      setSsoRedirecting(false);
      navigate('/');
    }
  };

  if (ssoRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="text-center space-y-4 z-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Eye size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Đang chuyển hướng...</h2>
          <p className="text-muted-foreground">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSwitcher variant="dropdown" />
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - FUN Ecosystem Branding */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            {/* Logo with hologram border */}
            <div 
              className="hologram-border p-[5px] rounded-full"
              style={{
                boxShadow: '0 0 30px rgba(147, 51, 234, 0.3), 0 0 60px rgba(59, 130, 246, 0.2), 0 10px 40px rgba(0,0,0,0.15)'
              }}
            >
              <img 
                src="/fun-ecosystem-logo.png" 
                alt="FUN Ecosystem" 
                width={256} 
                height={256}
                loading="eager"
                fetchPriority="high"
                decoding="sync"
                className="w-64 h-64 rounded-full bg-white object-cover"
              />
            </div>
          </div>

          {/* Title - Hologram gradient */}
          <h1 className="hologram-text text-4xl md:text-5xl font-bold mb-4">
            {t('authBrandTitle')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            {t('authBrandDescription')}
          </p>
          
          {/* Ecosystem tagline */}
          <p className="text-lg font-semibold mt-2 hologram-text">
            {t('authEcosystemTagline')}
          </p>
          
          {/* Platform Grid */}
          <div className="mt-8 hidden md:block">
            <div className="grid grid-cols-3 gap-3">
              {ECOSYSTEM_PLATFORMS.map((platform) => (
                <div 
                  key={platform.name}
                  className="flex items-center gap-2 p-2 rounded-xl bg-card/60 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <img src={platform.logo} alt={platform.name} className="w-7 h-7 rounded-full object-cover" />
                  <span className="text-sm font-medium text-muted-foreground">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full max-w-lg mx-auto min-h-[560px]">
          <UnifiedAuthForm ssoFlow={isSsoMode} />
          
          {/* Guest Mode */}
          <div className="mt-6 text-center">
            <div className="relative flex items-center gap-4 py-2">
              <div className="flex-1 border-t border-muted" />
              <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
                {t('orContinueAs')}
              </span>
              <div className="flex-1 border-t border-muted" />
            </div>
            
            {/* View as Guest - hologram border */}
            <div 
              className="relative hologram-border p-[3px] rounded-full mt-3"
              style={{
                boxShadow: '0 0 15px rgba(147, 51, 234, 0.15), 0 0 15px rgba(59, 130, 246, 0.15), 0 0 15px rgba(34, 197, 94, 0.15)'
              }}
            >
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-3 font-bold text-xl h-14 bg-white hover:bg-slate-50 border-0 rounded-full transition-colors"
              >
                <Eye size={24} className="text-purple-600" />
                <span className="hologram-text">
                  {t('viewAsGuest')}
                </span>
              </button>
            </div>
          </div>
          
          <p className="text-center mt-4 text-base text-muted-foreground font-medium">
            {t('authCreatePage')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
