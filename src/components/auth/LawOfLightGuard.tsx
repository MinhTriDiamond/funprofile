import { useEffect, useState, useRef, useCallback } from 'react';
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
  const [isBanned, setIsBanned] = useState(false);
  const wasAuthenticatedRef = useRef(false);
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkLawOfLightAcceptance = useCallback(async () => {
    try {
      const publicPaths = ['/law-of-light', '/docs', '/auth', '/reset-password'];
      const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path));

      if (isPublicPath) {
        setIsAllowed(true);
        setIsChecking(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const protectedPrefixes = ['/admin', '/set-password', '/begin', '/connected-apps'];
        const isProtectedPath = protectedPrefixes.some(p => location.pathname.startsWith(p));

        if (!isProtectedPath) {
          setIsAllowed(true);
          setIsChecking(false);
          return;
        }
        setIsChecking(false);
        navigate('/auth', { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('law_of_light_accepted, is_banned')
        .eq('id', session.user.id)
        .single();

      if (profile?.is_banned) {
        console.warn('[LawOfLightGuard] User is banned, signing out');
        await supabase.auth.signOut();
        setIsChecking(false);
        setIsBanned(true);
        return;
      }

      if (profile && !profile.law_of_light_accepted) {
        const pending = localStorage.getItem('law_of_light_accepted_pending');
        if (pending === 'true') {
          await supabase.from('profiles').update({
            law_of_light_accepted: true,
            law_of_light_accepted_at: new Date().toISOString()
          }).eq('id', session.user.id);
          localStorage.removeItem('law_of_light_accepted_pending');
          wasAuthenticatedRef.current = true;
          setIsAllowed(true);
          setIsChecking(false);
          return;
        }
        setIsChecking(false);
        navigate('/law-of-light', { replace: true });
        return;
      }

      wasAuthenticatedRef.current = true;
      setIsAllowed(true);
    } catch (error) {
      console.error('[LawOfLightGuard] Error:', error);
      setIsAllowed(true);
    } finally {
      setIsChecking(false);
    }
  }, [location.pathname, navigate]);

  // Effect 1: Auth listener — always active, independent of isAllowed
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Any event with a valid session → cancel pending sign-out, update state
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        if (signOutTimerRef.current) {
          clearTimeout(signOutTimerRef.current);
          signOutTimerRef.current = null;
        }
        if (session) {
          wasAuthenticatedRef.current = true;
        }
        // Only re-check law of light on actual sign-in
        if (event === 'SIGNED_IN' && session) {
          setIsAllowed(false);
          setIsChecking(true);
          setTimeout(() => {
            checkLawOfLightAcceptance();
          }, 150);
        }
      } else if (event === 'SIGNED_OUT') {
        // Debounce + verify: wait then double-check session before redirecting
        if (wasAuthenticatedRef.current) {
          if (signOutTimerRef.current) {
            clearTimeout(signOutTimerRef.current);
          }
          signOutTimerRef.current = setTimeout(async () => {
            signOutTimerRef.current = null;
            // Double-check: is the session truly gone?
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
              wasAuthenticatedRef.current = false;
              setIsAllowed(false);
              setIsChecking(false);
              navigate('/auth', { replace: true });
            }
            // If session recovered, do nothing
          }, 1500);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (signOutTimerRef.current) {
        clearTimeout(signOutTimerRef.current);
      }
    };
  }, [navigate, checkLawOfLightAcceptance]);

  // Effect 2: Initial profile check — runs on mount and location change
  useEffect(() => {
    if (isAllowed) return;

    const timeout = setTimeout(() => {
      setIsChecking(false);
      setIsAllowed(true);
    }, 8000);

    checkLawOfLightAcceptance();

    return () => clearTimeout(timeout);
  }, [location.pathname, isAllowed, checkLawOfLightAcceptance]);

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

  if (isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-destructive">Tài khoản đã bị cấm vĩnh viễn</h1>
          <p className="text-muted-foreground">
            Tài khoản của bạn đã bị cấm do vi phạm quy định. Bạn không thể đăng nhập hoặc sử dụng hệ thống.
            Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ admin.
          </p>
          <a href="/" className="text-primary underline text-sm">Quay về trang chủ</a>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
};
