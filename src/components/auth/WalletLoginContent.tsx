import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, CheckCircle2, Loader2, Mail, ShieldAlert } from 'lucide-react';

interface WalletLoginContentProps {
  onSuccess: (userId: string, isNewUser: boolean) => void;
}

export const WalletLoginContent = ({ onSuccess }: WalletLoginContentProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'idle' | 'signing' | 'verifying'>('idle');
  const authInProgressRef = useRef(false);

  const { address, isConnected, isConnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { disconnect } = useDisconnect();

  // When wallet connects, auto-trigger challenge + sign using VERIFIED address
  useEffect(() => {
    if (isConnected && address && !authInProgressRef.current && !loading && authStep === 'idle') {
      authInProgressRef.current = true;
      handleSignAndVerify(address);
    }
  }, [isConnected, address]);

  const handleConnectClick = () => {
    if (isConnected && address) {
      // Already connected — trigger auth directly
      if (!authInProgressRef.current) {
        authInProgressRef.current = true;
        handleSignAndVerify(address);
      }
    } else {
      if (openConnectModal) openConnectModal();
    }
  };

  const handleSignAndVerify = async (walletAddr: string) => {
    // CRITICAL: walletAddr comes from wagmi's useAccount (verified), never from user input
    if (!walletAddr) {
      authInProgressRef.current = false;
      return;
    }
    setLoading(true);
    setAuthStep('signing');
    try {
      // Step 1: Request challenge from server
      const { data: challengeData, error: challengeError } = await supabase.functions.invoke('sso-web3-auth', {
        body: { action: 'challenge', wallet_address: walletAddr },
      });
      if (challengeError || !challengeData?.nonce) {
        throw new Error(challengeData?.error || challengeError?.message || 'Failed to get challenge');
      }

      // Step 2: Sign server-provided message with the CONNECTED wallet
      const signature = await signMessageAsync({
        message: challengeData.message,
        account: walletAddr as `0x${string}`,
      });
      setAuthStep('verifying');

      // Step 3: Send signature + nonce for verification
      // CRITICAL: Send the same walletAddr (from wagmi) that was used for challenge
      const { data, error: verifyErr } = await supabase.functions.invoke('sso-web3-auth', {
        body: {
          wallet_address: walletAddr,
          signature,
          message: challengeData.message,
          nonce: challengeData.nonce,
        },
      });
      if (verifyErr) {
        throw new Error(data?.error || verifyErr.message || 'Authentication failed');
      }

      if (data?.success && data?.token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'email',
        });
        if (verifyError) throw verifyError;

        await supabase.from('profiles').update({ last_login_platform: 'FUN Profile' }).eq('id', data.user_id);

        if (data.is_new_user) {
          setNewUserId(data.user_id);
          setShowOnboarding(true);
        } else {
          toast.success(t('welcomeBack'));
        }
        onSuccess(data.user_id, data.is_new_user);
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (error: unknown) {
      console.error('Wallet auth error:', error);
      const err = error instanceof Error ? error : null;
      const errName = (error as { name?: string })?.name;
      if (errName === 'UserRejectedRequestError' || err?.message?.includes('rejected')) {
        toast.error('Đã hủy ký xác nhận');
      } else {
        toast.error('Không thể xác minh chữ ký ví. Vui lòng thử lại.');
      }
      disconnect();
    } finally {
      setLoading(false);
      setAuthStep('idle');
      authInProgressRef.current = false;
    }
  };

  const isLoading = loading || isConnecting || isSigning;

  return (
    <div className="space-y-6">
      {/* Main connect button — single step */}
      {authStep === 'idle' && !isLoading && (
        <>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-foreground">{t('walletConnect')}</h3>
            <p className="text-sm text-muted-foreground">Kết nối ví để đăng nhập hoặc tạo tài khoản</p>
          </div>

          <Button
            onClick={handleConnectClick}
            disabled={isLoading}
            className="w-full h-14 text-lg font-bold rounded-full relative overflow-hidden text-white"
            style={{
              background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #166534 100%)',
              boxShadow: '0 4px 20px rgba(22, 101, 52, 0.4)',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-white">
              <Wallet size={20} /> Kết nối ví
            </span>
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Kết nối ví EVM để xác thực danh tính
          </p>
        </>
      )}

      {/* Loading states */}
      {(authStep !== 'idle' || isLoading) && (
        <div className="text-center space-y-4 py-8">
          <Loader2 className="animate-spin mx-auto text-emerald-500" size={48} />
          <p className="text-muted-foreground font-medium">
            {authStep === 'signing' || isConnecting
              ? 'Đang kết nối ví...'
              : authStep === 'verifying'
              ? t('walletVerifying')
              : 'Đang xử lý...'}
          </p>
        </div>
      )}

      {/* Wallet-First Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="text-emerald-600" size={32} />
              </div>
            </div>
            <DialogTitle className="text-xl">Chào mừng đến FUN Profile! 🎉</DialogTitle>
            <Badge variant="secondary" className="mx-auto w-fit">
              <ShieldAlert className="w-3 h-3 mr-1" />
              Tài khoản giới hạn
            </Badge>
            <DialogDescription className="text-sm space-y-2">
              <span className="block">Bạn có thể khám phá FUN Profile ngay bây giờ.</span>
              <span className="block font-medium text-foreground">
                Liên kết email để mở khóa thưởng và tăng khả năng khôi phục tài khoản.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => {
                setShowOnboarding(false);
                navigate('/settings/security');
              }}
              className="w-full"
            >
              <Mail className="w-4 h-4 mr-2" />
              Liên kết email ngay
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowOnboarding(false)}
              className="w-full text-muted-foreground"
            >
              Để sau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
