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

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .refine(
      val => !['admin', 'administrator', 'system', 'root', 'moderator', 'mod', 'support', 'help'].includes(val.toLowerCase()),
      { message: 'This username is reserved' }
    )
    .optional(),
});

export const AuthForm = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        toast.success('Welcome back!');
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
        toast.success('Account created! Please check your email.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success('Password reset email sent! Please check your inbox.');
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative">
      {/* Outer Gold Metallic Frame - Sci-Fi Shield Shape */}
      <div className="relative p-2 rounded-lg"
           style={{
             background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #d97706 50%, #f59e0b 75%, #fbbf24 100%)',
             clipPath: 'polygon(24px 0, calc(100% - 24px) 0, 100% 24px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 24px 100%, 0 calc(100% - 24px), 0 24px)',
             boxShadow: '0 0 60px rgba(251, 191, 36, 0.6), 0 0 100px rgba(234, 179, 8, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.3)'
           }}>
        
        {/* Mechanical Details - Corner Accents */}
        <div className="absolute top-0 left-0 w-8 h-8" 
             style={{ 
               background: 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)',
               clipPath: 'polygon(0 0, 100% 0, 0 100%)',
               boxShadow: 'inset 1px 1px 2px rgba(255, 255, 255, 0.5)'
             }} />
        <div className="absolute top-0 right-0 w-8 h-8" 
             style={{ 
               background: 'linear-gradient(225deg, #fcd34d 0%, #fbbf24 100%)',
               clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
               boxShadow: 'inset -1px 1px 2px rgba(255, 255, 255, 0.5)'
             }} />
        <div className="absolute bottom-0 left-0 w-8 h-8" 
             style={{ 
               background: 'linear-gradient(45deg, #fcd34d 0%, #fbbf24 100%)',
               clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
               boxShadow: 'inset 1px -1px 2px rgba(255, 255, 255, 0.5)'
             }} />
        <div className="absolute bottom-0 right-0 w-8 h-8" 
             style={{ 
               background: 'linear-gradient(315deg, #fcd34d 0%, #fbbf24 100%)',
               clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
               boxShadow: 'inset -1px -1px 2px rgba(255, 255, 255, 0.5)'
             }} />

        {/* Inner Pearl White Background */}
        <Card className="relative border-0 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)',
                clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1)'
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
              {isLogin ? 'Welcome Back' : 'Join FUN Profile'}
            </CardTitle>
            <CardDescription className="text-center text-slate-600">
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative z-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700 font-semibold text-sm uppercase tracking-wide">Username</Label>
                  <div className="relative group">
                    {/* Energy Slot Border */}
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 p-[2px]">
                      <div className="w-full h-full bg-white rounded-lg" />
                    </div>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={!isLogin}
                      className="relative z-10 border-2 border-slate-300 bg-gradient-to-br from-white to-slate-50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/30 transition-all duration-300"
                      style={{
                        boxShadow: 'inset 0 2px 6px rgba(100, 116, 139, 0.15), 0 0 0 rgba(16, 185, 129, 0)',
                      }}
                    />
                    {/* Inner Green Glow on Focus */}
                    <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                         style={{
                           boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.3)'
                         }} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-semibold text-sm uppercase tracking-wide">Email</Label>
                <div className="relative group">
                  {/* Metallic Silver/Grey Border */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 p-[2px]">
                    <div className="w-full h-full bg-white rounded-lg" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="relative z-10 border-2 border-slate-300 bg-gradient-to-br from-white to-slate-50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/30 transition-all duration-300"
                    style={{
                      boxShadow: 'inset 0 2px 6px rgba(100, 116, 139, 0.15), 0 0 0 rgba(16, 185, 129, 0)',
                    }}
                  />
                  {/* Inner Green Glow on Focus */}
                  <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                       style={{
                         boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.3)'
                       }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-semibold text-sm uppercase tracking-wide">Password</Label>
                <div className="relative group">
                  {/* Metallic Silver/Grey Border */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 p-[2px]">
                    <div className="w-full h-full bg-white rounded-lg" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="relative z-10 pr-10 border-2 border-slate-300 bg-gradient-to-br from-white to-slate-50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/30 transition-all duration-300"
                    style={{
                      boxShadow: 'inset 0 2px 6px rgba(100, 116, 139, 0.15), 0 0 0 rgba(16, 185, 129, 0)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-500 transition-colors z-20"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {/* Inner Green Glow on Focus */}
                  <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                       style={{
                         boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.3)'
                       }} />
                </div>
              </div>
              
              {/* Ignition Power Switch Button */}
              <Button 
                type="submit" 
                className="w-full relative overflow-hidden border-0 h-14 text-lg font-bold text-white transition-all duration-300 group mt-6" 
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 30%, #10b981 50%, #059669 70%, #047857 100%)',
                  boxShadow: `
                    0 0 40px rgba(16, 185, 129, 0.7),
                    0 0 80px rgba(16, 185, 129, 0.4),
                    0 4px 20px rgba(0, 0, 0, 0.3),
                    inset 0 1px 2px rgba(255, 255, 255, 0.4),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.2)
                  `,
                  borderRadius: '0.75rem'
                }}
              >
                {/* Animated Glow Layer */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"
                     style={{ filter: 'blur(8px)' }} />
                
                {/* Energy Pulse Animation */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                       style={{ 
                         animation: 'shimmer 2s infinite',
                         backgroundSize: '200% 100%'
                       }} />
                </div>

                <span className="relative z-10 flex items-center justify-center gap-3 tracking-wider uppercase">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Initializing...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="4" className="animate-pulse" />
                        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                        <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                      </svg>
                      {isLogin ? 'Activate Sign In' : 'Initialize Sign Up'}
                      <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 3 L16 10 L10 17 M16 10 L4 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
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
                    Forgot password?
                  </button>
                </div>
              )}
              {showForgotPassword && (
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-2 border-slate-400 bg-white/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/50"
                  />
                  <Button 
                    onClick={handleForgotPassword} 
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                    disabled={loading}
                  >
                    Send Reset Email
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
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500 font-semibold">OR</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-slate-300 bg-white/60 hover:bg-slate-50 hover:border-emerald-400 text-slate-700 font-semibold transition-all"
                onClick={() => navigate('/')}
              >
                Use without account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* CSS Animation for shimmer effect */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};
