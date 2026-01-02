import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export const AuthForm = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || t('authErrorGeneric'));
      setGoogleLoading(false);
    }
  };

  const getAuthSchema = () => z.object({
    email: z.string().email(t('authErrorInvalidEmail')),
    password: z.string().min(6, t('authErrorPasswordShort')),
    username: z.string()
      .min(3, t('authErrorUsernameShort'))
      .max(30, t('authErrorUsernameLong'))
      .refine(
        val => !['admin', 'administrator', 'system', 'root', 'moderator', 'mod', 'support', 'help'].includes(val.toLowerCase()),
        { message: t('authErrorUsernameReserved') }
      )
      .optional(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const authSchema = getAuthSchema();
      const validation = authSchema.safeParse({
        email,
        password,
        username: isLogin ? undefined : username,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t('welcomeBack'));
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success(t('authSuccessSignUp'));
      }
    } catch (error: any) {
      toast.error(error.message || t('authErrorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error(t('authErrorInvalidEmail'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success(t('authSuccessPasswordReset'));
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || t('authErrorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative">
      {/* Outer Gold Metallic Frame */}
      <div className="relative p-2 rounded-3xl"
           style={{
             background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 20%, #fcd34d 40%, #d97706 60%, #f59e0b 80%, #fbbf24 100%)',
             boxShadow: '0 0 60px rgba(251, 191, 36, 0.6), 0 0 100px rgba(234, 179, 8, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.3)'
           }}>
        
        {/* Decorative Corner Glow Effects */}
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full" 
             style={{ background: 'radial-gradient(circle, #fcd34d 0%, transparent 70%)', opacity: 0.6 }} />
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full" 
             style={{ background: 'radial-gradient(circle, #fcd34d 0%, transparent 70%)', opacity: 0.6 }} />
        <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full" 
             style={{ background: 'radial-gradient(circle, #fcd34d 0%, transparent 70%)', opacity: 0.6 }} />
        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full" 
             style={{ background: 'radial-gradient(circle, #fcd34d 0%, transparent 70%)', opacity: 0.6 }} />

        {/* Inner Pearl White Background */}
        <Card className="relative border-0 overflow-hidden rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 25%, #ffffff 50%, #f1f5f9 75%, #ffffff 100%)',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 0 40px rgba(251, 191, 36, 0.05)'
              }}>
          
          {/* Circuit Board Pattern */}
          <div className="absolute inset-0 opacity-[0.03]" 
               style={{
                 backgroundImage: `
                   linear-gradient(90deg, #10b981 1px, transparent 1px),
                   linear-gradient(0deg, #10b981 1px, transparent 1px),
                   radial-gradient(circle at 20% 30%, #10b981 2px, transparent 2px),
                   radial-gradient(circle at 80% 70%, #10b981 2px, transparent 2px)
                 `,
                 backgroundSize: '30px 30px, 30px 30px, 60px 60px, 60px 60px',
                 backgroundPosition: '0 0, 0 0, 0 0, 30px 30px'
               }} />
          
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
              {isLogin ? t('authWelcomeBack') : t('authCreateAccount')}
            </CardTitle>
            <CardDescription className="text-center text-slate-600">
              {isLogin ? t('authSignInTitle') : t('authJoinUs')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative z-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700 font-semibold text-sm uppercase tracking-wide">
                    {t('authUsername')}
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 p-[2px]">
                      <div className="w-full h-full bg-white rounded-xl" />
                    </div>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={!isLogin}
                      placeholder={t('authUsernamePlaceholder')}
                      className="relative z-10 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-white to-slate-50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/30 transition-all duration-300"
                      style={{ boxShadow: 'inset 0 2px 6px rgba(100, 116, 139, 0.15)' }}
                    />
                    <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                         style={{ boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.3)' }} />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-semibold text-sm uppercase tracking-wide">
                  {t('authEmail')}
                </Label>
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 p-[2px]">
                    <div className="w-full h-full bg-white rounded-xl" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t('authEmailPlaceholder')}
                    className="relative z-10 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-white to-slate-50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/30 transition-all duration-300"
                    style={{ boxShadow: 'inset 0 2px 6px rgba(100, 116, 139, 0.15)' }}
                  />
                  <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                       style={{ boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.3)' }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-semibold text-sm uppercase tracking-wide">
                  {t('authPassword')}
                </Label>
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 p-[2px]">
                    <div className="w-full h-full bg-white rounded-xl" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={t('authPasswordPlaceholder')}
                    className="relative z-10 rounded-xl pr-10 border-2 border-slate-300 bg-gradient-to-br from-white to-slate-50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/30 transition-all duration-300"
                    style={{ boxShadow: 'inset 0 2px 6px rgba(100, 116, 139, 0.15)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-500 transition-colors z-20"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                       style={{ boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.3)' }} />
                </div>
              </div>
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full relative overflow-hidden border-0 h-14 text-lg font-bold text-white transition-all duration-300 group mt-6 rounded-2xl" 
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 20%, #34d399 40%, #10b981 60%, #059669 80%, #047857 100%)',
                  boxShadow: '0 0 40px rgba(16, 185, 129, 0.7), 0 0 80px rgba(16, 185, 129, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"
                     style={{ filter: 'blur(8px)' }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                       style={{ animation: 'shimmer 2s infinite', backgroundSize: '200% 100%' }} />
                </div>
                <span className="relative z-10 flex items-center justify-center gap-3 tracking-wider uppercase">
                  {loading ? t('authInitializing') : (isLogin ? t('authSignIn') : t('authSignUp'))}
                </span>
              </Button>
            </form>
            
            <div className="mt-5 space-y-3">
              {isLogin && (
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(!showForgotPassword)}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
                  >
                    {t('authForgotPassword')}
                  </button>
                </div>
              )}
              
              {showForgotPassword && (
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder={t('authEmailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-2 border-slate-400 bg-white/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/50"
                  />
                  <Button 
                    onClick={handleForgotPassword} 
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                    disabled={loading}
                  >
                    {t('authSendResetEmail')}
                  </Button>
                </div>
              )}
              
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setShowForgotPassword(false);
                  }}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
                >
                  {isLogin ? t('authNoAccount') : t('authHaveAccount')}{' '}
                  <span className="font-bold">{isLogin ? t('authSignUpLink') : t('authSignInLink')}</span>
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500 font-semibold">{t('authOr')}</span>
                </div>
              </div>
              
              {/* Google Sign In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-2 border-slate-300 bg-white hover:bg-slate-50 hover:border-emerald-400 text-slate-700 font-semibold transition-all flex items-center justify-center gap-3"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleLoading ? t('authInitializing') : t('authSignInWithGoogle')}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-slate-300 bg-white/60 hover:bg-slate-50 hover:border-emerald-400 text-slate-700 font-semibold transition-all"
                onClick={() => navigate('/')}
              >
                {t('authUseWithoutAccount')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};
