import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/auth/AuthForm';

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary p-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-2">
            <img 
              src="/fun-profile-logo.jpg" 
              alt="FUN Profile WEB3" 
              className="w-full h-full rounded-full ring-4 ring-primary/30 shadow-xl"
            />
          </div>
        </div>
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;
