import { useEffect, useState, useRef } from 'react';
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
  // Track whether user was actually authenticated during this app session
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    // Skip re-check if already allowed (prevents false logout during token refresh)
    if (isAllowed) return;

    const checkLawOfLightAcceptance = async () => {
      try {
        // Skip check for public pages
        const publicPaths = ['/law-of-light', '/docs', '/auth', '/reset-password'];
        const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path));
        
        if (isPublicPath) {
          setIsAllowed(true);
          setIsChecking(false);
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
          navigate('/auth', { replace: true });
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('law_of_light_accepted, is_banned')
          .eq('id', session.user.id)
          .single();

        // Check if user is permanently banned
        if (profile?.is_banned) {
          console.warn('[LawOfLightGuard] User is banned, signing out');
          await supabase.auth.signOut();
          setIsChecking(false);
          setIsBanned(true);
          return;
        }

        if (profile && !profile.law_of_light_accepted) {
          // Tự động đồng bộ nếu có pending flag trong localStorage
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

        // User is authenticated and accepted law of light
        wasAuthenticatedRef.current = true;
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
        wasAuthenticatedRef.current = true;
        // Reset isAllowed để buộc kiểm tra lại từ database
        setIsAllowed(false);
        setIsChecking(true);
        setTimeout(() => {
          checkLawOfLightAcceptance();
        }, 150);
      } else if (event === 'SIGNED_OUT') {
        // Only redirect if user was actually authenticated in this app session
        // Guests who never signed in will NOT be redirected
        if (wasAuthenticatedRef.current) {
          wasAuthenticatedRef.current = false;
          setIsAllowed(false);
          setIsChecking(false);
          navigate('/auth', { replace: true });
        }
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
