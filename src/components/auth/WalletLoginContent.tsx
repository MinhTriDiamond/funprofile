import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { validateEvmAddress } from '@/utils/walletValidation';
import { Wallet, CheckCircle2, Loader2, LogIn, Search, Sparkles, Mail, ShieldAlert } from 'lucide-react';

interface WalletLoginContentProps {
  onSuccess: (userId: string, isNewUser: boolean) => void;
}

export const WalletLoginContent = ({ onSuccess }: WalletLoginContentProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'checked' | 'sign' | 'verify'>('input');
  const [loading, setLoading] = useState(false);
  const [walletStatus, setWalletStatus] = useState<'checking' | 'registered' | 'not_registered' | null>(null);
  const [pastedAddress, setPastedAddress] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const autoSignRef = useRef(false);

  const { address, isConnected, isConnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { disconnect } = useDisconnect();

  // Auto-sign when wallet connects and matches pasted address
  useEffect(() => {
    if (
      isConnected &&
      address &&
      pastedAddress &&
      address.toLowerCase() === pastedAddress.toLowerCase() &&
      autoSignRef.current
    ) {
      autoSignRef.current = false;
      setStep('sign');
      handleSignAndVerify();
    }
  }, [isConnected, address]);

  const checkWalletRegistration = async (addr: string) => {
    if (!validateEvmAddress(addr)) return;
    setWalletStatus('checking');
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sso-web3-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ action: 'check', wallet_address: addr }),
      });
      const data = await response.json();
      setWalletStatus(data?.registered ? 'registered' : 'not_registered');
      setStep('checked');
    } catch {
      setWalletStatus('registered');
      setStep('checked');
    }
  };

  const handleLoginClick = () => {
    autoSignRef.current = true;
    if (isConnected && address?.toLowerCase() === pastedAddress.toLowerCase()) {
      autoSignRef.current = false;
      setStep('sign');
      handleSignAndVerify();
    } else {
      if (isConnected) disconnect();
      if (openConnectModal) openConnectModal();
    }
  };

  const handleSignAndVerify = async () => {
    const walletAddr = pastedAddress;
    if (!walletAddr) return;
    setLoading(true);
    try {
      // Step 1: Request challenge from server
      const challengeRes = await fetch(`${SUPABASE_URL}/functions/v1/sso-web3-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ action: 'challenge', wallet_address: walletAddr }),
      });
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok || !challengeData?.nonce) {
        throw new Error(challengeData?.error || 'Failed to get challenge');
      }

      // Step 2: Sign server-provided message
      const signature = await signMessageAsync({
        message: challengeData.message,
        account: walletAddr as `0x${string}`,
      });
      setStep('verify');

      // Step 3: Send signature + nonce for verification
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sso-web3-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({
          wallet_address: walletAddr,
          signature,
          message: challengeData.message,
          nonce: challengeData.nonce,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Authentication failed');
      }

      if (data?.success && data?.token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'email',
        });
        if (verifyError) throw verifyError;

        await supabase.from('profiles').update({ last_login_platform: 'FUN Profile' }).eq('id', data.user_id);

        if (data.is_new_user) {
          // Show onboarding dialog for wallet-first signup
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
        // Soft error UX
        toast.error('Không thể xác minh chữ ký ví. Vui lòng thử lại.');
      }
      setStep('checked');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    disconnect();
    setStep('input');
    setPastedAddress('');
    setWalletStatus(null);
    autoSignRef.current = false;
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const isLoading = loading || isConnecting || isSigning;

  return (
    <div className="space-y-6">
      {step === 'input' && (
        <>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-foreground">{t('walletConnect')}</h3>
            <p className="text-sm text-muted-foreground">Dán địa chỉ ví của bạn để đăng nhập</p>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="0x..."
              value={pastedAddress}
              onChange={(e) => setPastedAddress(e.target.value.trim())}
              className="font-mono text-sm h-12"
              disabled={walletStatus === 'checking'}
            />
            <Button
              onClick={() => checkWalletRegistration(pastedAddress)}
              disabled={!pastedAddress || walletStatus === 'checking'}
              className="w-full h-14 text-lg font-bold rounded-full relative overflow-hidden text-white"
              style={{
                background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #166534 100%)',
                boxShadow: '0 4px 20px rgba(22, 101, 52, 0.4)',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                {walletStatus === 'checking' ? (
                  <><Loader2 className="animate-spin" size={20} /> Đang kiểm tra...</>
                ) : (
                  <><Search size={20} /> Kiểm Tra Ví</>
                )}
              </span>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Dán địa chỉ ví EVM (0x...) để kiểm tra và đăng nhập
          </p>
        </>
      )}

      {step === 'checked' && (
        <>
          <div className="text-center space-y-2">
            {walletStatus === 'registered' ? (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2">
                <CheckCircle2 className="text-emerald-600" size={28} />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <Sparkles className="text-primary" size={28} />
              </div>
            )}
            <p className="font-mono text-sm bg-muted px-3 py-2 rounded-lg inline-block">
              {shortenAddress(pastedAddress)}
            </p>
          </div>

          {walletStatus === 'registered' && (
            <Button
              onClick={handleLoginClick}
              disabled={isLoading}
              className="w-full h-14 text-lg font-bold rounded-full relative overflow-hidden text-white"
              style={{
                background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #166534 100%)',
                boxShadow: '0 4px 20px rgba(22, 101, 52, 0.4)',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                {isLoading ? (
                  <><Loader2 className="animate-spin" size={20} /> {t('walletLoggingIn')}</>
                ) : (
                  <><LogIn size={20} /> {t('walletLoginBtn')}</>
                )}
              </span>
            </Button>
          )}

          {walletStatus === 'not_registered' && (
            <div className="space-y-3">
              <div className="text-center space-y-1">
                <h4 className="font-semibold text-foreground">Tạo tài khoản nhanh bằng ví</h4>
                <p className="text-sm text-muted-foreground">
                  Ký xác nhận để bắt đầu với FUN Profile
                </p>
              </div>
              <Button
                onClick={handleLoginClick}
                disabled={isLoading}
                className="w-full h-14 text-lg font-bold rounded-full relative overflow-hidden text-white"
                style={{
                  background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #166534 100%)',
                  boxShadow: '0 4px 20px rgba(22, 101, 52, 0.4)',
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                  {isLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Đang tạo tài khoản...</>
                  ) : (
                    <><Wallet size={20} /> Tạo tài khoản bằng ví</>
                  )}
                </span>
              </Button>
            </div>
          )}

          <button
            onClick={handleCancel}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t('cancel')}
          </button>
        </>
      )}

      {(step === 'sign' || step === 'verify') && (
        <div className="text-center space-y-4 py-8">
          <Loader2 className="animate-spin mx-auto text-emerald-500" size={48} />
          <p className="text-muted-foreground font-medium">
            {step === 'sign' ? 'Đang kết nối ví...' : t('walletVerifying')}
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
