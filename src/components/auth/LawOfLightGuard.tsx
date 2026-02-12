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
          const guestAllowedPaths = ['/', '/feed', '/about', '/install', '/leaderboard', '/benefactors', '/donations'];
          const isGuestPath = guestAllowedPaths.includes(location.pathname)
            || location.pathname.startsWith('/profile/')
            || location.pathname.startsWith('/@')
            || location.pathname.startsWith('/post/')
            || location.pathname.startsWith('/reels');
          
          if (isGuestPath) {
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

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setTimeout(() => {
          checkLawOfLightAcceptance();
        }, 0);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

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