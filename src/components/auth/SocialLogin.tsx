import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
interface SocialLoginProps {
  onSuccess?: (userId: string, isNewUser: boolean) => void;
}
export const SocialLogin = ({
  onSuccess
}: SocialLoginProps) => {
  const {
    t
  } = useLanguage();
  const [googleLoading, setGoogleLoading] = useState(false);

  // Listen for OAuth sign-in and handle success callback
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const provider = session.user.app_metadata?.provider;
        if (provider && provider !== 'email') {
          // Defer the database update and callback to avoid auth deadlock
          setTimeout(async () => {
            try {
              // Update last_login_platform to 'FUN Profile'
              await supabase.from('profiles').update({
                last_login_platform: 'FUN Profile'
              }).eq('id', session.user.id);
              console.log('[SocialLogin] Updated last_login_platform to: FUN Profile');

              // Check if user is new (created within last minute)
              const {
                data: profile
              } = await supabase.from('profiles').select('created_at').eq('id', session.user.id).single();
              const isNewUser = profile && new Date().getTime() - new Date(profile.created_at).getTime() < 60000;
              console.log('[SocialLogin] User isNew:', isNewUser);

              // Call success callback if provided
              if (onSuccess) {
                onSuccess(session.user.id, isNewUser || false);
              }
            } catch (error) {
              console.error('[SocialLogin] Error:', error);
            }
          }, 0);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [onSuccess]);
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || t('authErrorGeneric'));
      setGoogleLoading(false);
    }
  };
  return;
};