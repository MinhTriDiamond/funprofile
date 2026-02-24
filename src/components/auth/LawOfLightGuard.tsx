import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface LawOfLightGuardProps {
  children: React.ReactNode;
}

export const LawOfLightGuard = ({ children }: LawOfLightGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // Skip re-check if already allowed (prevents false logout during token refresh)
    if (isAllowed) return;

    const checkLawOfLightAcceptance = async () => {
      try {
        // Skip check for public pages
        const publicPaths = ['/law-of-light', '/docs'];
        const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path));
        
        if (isPublicPath) {
          setIsAllowed(true);
          setIsChecking(false);
          return;
        }

        // Special handling for /auth - require Law of Light acceptance first
        if (location.pathname.startsWith('/auth')) {
          const pending = localStorage.getItem('law_of_light_accepted_pending');
          if (pending === 'true') {
            setIsAllowed(true);
            setIsChecking(false);
            return;
          }
          setIsChecking(false);
          navigate('/law-of-light', { replace: true });
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Blacklist: only these paths require login
          const protectedPrefixes = ['/admin', '/set-password', '/begin', '/connected-apps'];
          const isProtectedPath = protectedPrefixes.some(p => location.pathname.startsWith(p));

          if (!isProtectedPath) {
            setIsAllowed(true);
            setIsChecking(false);
            return;
          }
          setIsChecking(false);
          navigate('/law-of-light', { replace: true });
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('law_of_light_accepted')
          .eq('id', session.user.id)
          .single();

        if (profile && !profile.law_of_light_accepted) {
          setIsChecking(false);
          navigate('/law-of-light', { replace: true });
          return;
        }

        setIsAllowed(true);
      } catch (error) {
        console.error('[LawOfLightGuard] Error:', error);
        // Fail-open: allow access instead of stuck spinner
        setIsAllowed(true);
      } finally {
        setIsChecking(false);
      }
    };

    // Timeout safety: 8s max
    const timeout = setTimeout(() => {
      setIsChecking(false);
      setIsAllowed(true);
    }, 8000);

    checkLawOfLightAcceptance();

    // Listen for auth state changes - only re-check on SIGNED_IN, ignore token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Delay to ensure auth state is fully stable before re-checking
        setTimeout(() => {
          checkLawOfLightAcceptance();
        }, 150);
      } else if (event === 'SIGNED_OUT') {
        // On explicit sign out, navigate to law-of-light
        setIsAllowed(false);
        setIsChecking(false);
        navigate('/law-of-light', { replace: true });
      }
      // TOKEN_REFRESHED and other events are intentionally ignored to prevent false logouts
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, isAllowed]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang kiểm tra...</p>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
};