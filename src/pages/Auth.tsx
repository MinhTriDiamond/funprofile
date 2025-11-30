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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Space Video Background */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/space-background.mp4" type="video/mp4" />
      </video>
      
      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo with Strong Halo Effect */}
        <div className="text-center mb-16 relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 flex items-center justify-center -top-8">
            <div className="w-56 h-56 rounded-full bg-gradient-to-br from-yellow-400/60 via-emerald-400/50 to-yellow-500/60 blur-3xl animate-pulse" 
                 style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          </div>
          {/* Inner glow ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-emerald-300/70 via-yellow-400/60 to-emerald-300/70 blur-2xl" />
          </div>
          {/* Logo */}
          <div className="relative z-10">
            <div className="w-36 h-36 mx-auto rounded-full bg-gradient-to-br from-yellow-400/20 to-emerald-400/20 p-2 backdrop-blur-sm">
              <img 
                src="/fun-profile-logo.jpg" 
                alt="FUN Profile WEB3" 
                className="w-full h-full rounded-full ring-4 ring-yellow-400/50 shadow-2xl"
                style={{ 
                  filter: 'drop-shadow(0 0 40px rgba(234, 179, 8, 0.8)) drop-shadow(0 0 20px rgba(16, 185, 129, 0.8))'
                }}
              />
            </div>
          </div>
        </div>
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;
