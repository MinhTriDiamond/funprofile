import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Mail, ArrowRight, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface EmailOtpLoginProps {
  onSuccess: (userId: string, isNewUser: boolean) => void;
}

export const EmailOtpLogin = ({ onSuccess }: EmailOtpLoginProps) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email) {
      toast.error(t('authErrorInvalidEmail'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sso-otp-request', {
        body: { identifier: email, type: 'email' },
      });

      if (error) throw error;

      if (data?.success) {
        setStep('otp');
        setCountdown(300); // 5 minutes
        // For testing - show debug OTP
        if (data.debug_otp) {
          setDebugOtp(data.debug_otp);
          toast.success(`OTP đã gửi! (Test: ${data.debug_otp})`);
        } else {
          toast.success(`${t('otpSentTo')} ${email}`);
        }
      } else {
        throw new Error(data?.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('OTP request error:', error);
      toast.error(error.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error(t('otpInvalid'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sso-otp-verify', {
        body: { identifier: email, code: otp, type: 'email' },
      });

      if (error) throw error;

      if (data?.success && data?.magic_link) {
        // Exchange magic link for session
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            shouldCreateUser: false,
          },
        });

        // Use the magic link token directly
        const urlParams = new URL(data.magic_link).hash.substring(1);
        const params = new URLSearchParams(urlParams);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        toast.success(t('welcomeBack'));
        onSuccess(data.user_id, data.is_new_user);
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('OTP verify error:', error);
      toast.error(error.message || t('otpInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp('');
    await handleSendOtp();
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {step === 'email' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 font-semibold text-sm uppercase tracking-wide">
              {t('authEmail')}
            </Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 z-20">
                <Mail size={18} />
              </div>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('authEmailPlaceholder')}
                className="pl-10 h-12 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-white to-slate-50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/30 transition-all duration-300"
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              />
            </div>
          </div>

          <Button
            onClick={handleSendOtp}
            disabled={loading || !email}
            className="w-full h-14 text-lg font-bold rounded-2xl relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.5), 0 4px 15px rgba(0, 0, 0, 0.2)',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('authInitializing')}
                </>
              ) : (
                <>
                  {t('otpSendCode')}
                  <ArrowRight size={20} />
                </>
              )}
            </span>
          </Button>
        </>
      ) : (
        <>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-2">
              <Mail className="text-emerald-600" size={28} />
            </div>
            <p className="text-slate-600">
              {t('otpSentTo')} <span className="font-semibold text-emerald-600">{email}</span>
            </p>
            {debugOtp && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                🔧 Test Mode - OTP: <span className="font-mono font-bold">{debugOtp}</span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Label className="text-slate-700 font-semibold text-sm uppercase tracking-wide block text-center">
              {t('otpEnterCode')}
            </Label>
            <div className="flex justify-center">
              <InputOTP
                value={otp}
                onChange={setOtp}
                maxLength={6}
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="w-12 h-14 text-xl font-bold border-2 border-slate-300 rounded-xl bg-white focus:border-emerald-500"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {countdown > 0 && (
            <p className="text-center text-sm text-slate-500">
              {t('otpExpireIn')}: <span className="font-mono font-bold text-emerald-600">{formatCountdown(countdown)}</span>
            </p>
          )}

          <Button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            className="w-full h-14 text-lg font-bold rounded-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.5), 0 4px 15px rgba(0, 0, 0, 0.2)',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('walletVerifying')}
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  {t('otpVerify')}
                </>
              )}
            </span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleResendOtp}
            disabled={loading || countdown > 270} // Can resend after 30 seconds
            className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          >
            <RefreshCw size={16} className="mr-2" />
            {t('otpResend')}
          </Button>

          <button
            onClick={() => {
              setStep('email');
              setOtp('');
              setDebugOtp(null);
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-700"
          >
            ← {t('cancel')}
          </button>
        </>
      )}
    </div>
  );
};
