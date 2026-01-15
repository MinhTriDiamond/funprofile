import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedAuthForm } from '@/components/auth/UnifiedAuthForm';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { getAuthLogoUrl, getSponsoredLogoUrl } from '@/lib/staticImageOptimizer';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  
  // SSO flow parameters
  const returnTo = searchParams.get('return_to');
  const ssoFlow = searchParams.get('sso_flow') === 'true';

  useEffect(() => {
    // Check if Law of Light was accepted before allowing access to auth
    const pending = localStorage.getItem('law_of_light_accepted_pending');
    if (!pending) {
      navigate('/law-of-light', { replace: true });
      return;
    }

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // If SSO flow, redirect back to authorize endpoint with token
        if (ssoFlow && returnTo) {
          handleSSORedirect(session.access_token);
        } else {
          navigate('/');
        }
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // If SSO flow, redirect back to authorize endpoint with token
        if (ssoFlow && returnTo) {
          handleSSORedirect(session.access_token);
        }
        // Otherwise handled by UnifiedAuthForm callbacks
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, ssoFlow, returnTo]);

  // Handle SSO redirect back to authorize endpoint
  const handleSSORedirect = (accessToken: string) => {
    if (!returnTo) return;
    
    try {
      // Parse the return_to URL and add authorization
      const authorizeUrl = new URL(returnTo);
      
      // Redirect to authorize endpoint - browser will make the request
      // We need to make a fetch call with the token, then redirect
      fetch(returnTo, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.redirect_uri) {
            window.location.href = data.redirect_uri;
          } else if (data.error) {
            console.error('SSO authorize error:', data);
            navigate('/');
          }
        })
        .catch(err => {
          console.error('SSO redirect error:', err);
          navigate('/');
        });
    } catch (err) {
      console.error('Invalid return_to URL:', err);
      navigate('/');
    }
  };

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
            {/* LCP Image - optimized for display size, eager loading, high priority */}
            <img 
              src={getAuthLogoUrl('/fun-profile-logo-40.webp')} 
              alt="FUN Profile" 
              width={64} 
              height={64}
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              className="w-16 h-16 rounded-full shadow-lg" 
            />
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