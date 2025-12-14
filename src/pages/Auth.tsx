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
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <img 
              src="/fun-profile-logo-40.webp" 
              alt="FUN Profile" 
              width={64}
              height={64}
              className="w-16 h-16 rounded-full shadow-lg"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            FUN Profile
          </h1>
          <p className="text-xl md:text-2xl text-gray-600">
            Kết nối với bạn bè và thế giới xung quanh bạn trên FUN Profile.
          </p>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <AuthForm />
          </div>
          
          <p className="text-center mt-6 text-sm text-muted-foreground">
            <strong>Tạo Trang</strong> dành cho người nổi tiếng, thương hiệu hoặc doanh nghiệp.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-4">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:underline">Tiếng Việt</a>
            <a href="#" className="hover:underline">English</a>
            <a href="#" className="hover:underline">中文</a>
            <a href="#" className="hover:underline">日本語</a>
            <a href="#" className="hover:underline">한국어</a>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground mt-2">
            <a href="#" className="hover:underline">Đăng ký</a>
            <a href="#" className="hover:underline">Đăng nhập</a>
            <a href="#" className="hover:underline">Trợ giúp</a>
            <span>FUN Profile © 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
