import { useState, useEffect, useRef } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { validateEvmAddress } from '@/utils/walletValidation';
import { Wallet, CheckCircle2, Loader2, LogIn, AlertTriangle, Search } from 'lucide-react';

interface WalletLoginContentProps {
  onSuccess: (userId: string, isNewUser: boolean) => void;
}

export const WalletLoginContent = ({ onSuccess }: WalletLoginContentProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<'input' | 'checked' | 'sign' | 'verify'>('input');
  const [loading, setLoading] = useState(false);
  const [walletStatus, setWalletStatus] = useState<'checking' | 'registered' | 'not_registered' | null>(null);
  const [pastedAddress, setPastedAddress] = useState('');
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-web3-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: 'check', wallet_address: addr }),
        }
      );
      const data = await response.json();
      const status = data?.registered ? 'registered' : 'not_registered';
      setWalletStatus(status);
      setStep('checked');
    } catch {
      setWalletStatus('registered');
      setStep('checked');
    }
  };

  const handleLoginClick = () => {
    autoSignRef.current = true;
    // If already connected with matching address, sign immediately
    if (isConnected && address?.toLowerCase() === pastedAddress.toLowerCase()) {
      autoSignRef.current = false;
      setStep('sign');
      handleSignAndVerify();
    } else {
      // Disconnect any existing connection, then open modal
      if (isConnected) disconnect();
      if (openConnectModal) openConnectModal();
    }
  };

  const handleSignAndVerify = async () => {
    const walletAddr = pastedAddress;
    if (!walletAddr) return;
    setLoading(true);
    try {
      const nonce = Math.random().toString(36).substring(2, 15);
      const timestamp = new Date().toISOString();
      const message = `Welcome to FUN Profile!\n\nSign this message to authenticate.\n\nWallet: ${walletAddr}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

      const signature = await signMessageAsync({ message, account: walletAddr as `0x${string}` });
      setStep('verify');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-web3-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ wallet_address: walletAddr, signature, message, nonce }),
        }
      );
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
        toast.success(data.is_new_user ? t('welcomeNewUser') : t('welcomeBack'));
        onSuccess(data.user_id, data.is_new_user);
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Wallet auth error:', error);
      if (error.name === 'UserRejectedRequestError' || error.message?.includes('rejected')) {
        toast.error('Signature rejected');
      } else if (error.message?.includes('WALLET_NOT_REGISTERED')) {
        setWalletStatus('not_registered');
      } else {
        toast.error(error.message || t('errorOccurred'));
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
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Kiểm Tra Ví
                  </>
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-2">
                <AlertTriangle className="text-amber-500" size={28} />
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
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {t('walletLoggingIn')}
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    {t('walletLoginBtn')}
                  </>
                )}
              </span>
            </Button>
          )}

          {walletStatus === 'not_registered' && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <h4 className="font-semibold text-amber-700 dark:text-amber-400">
                  Ví chưa được liên kết
                </h4>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Ví này chưa được liên kết với tài khoản nào trên FUN Profile.
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1.5 list-disc pl-4">
                <li>
                  Nếu bạn đã có tài khoản, hãy đăng nhập bằng <strong>Email</strong> hoặc <strong>Google</strong>, sau đó kết nối ví trong phần <strong>Cài Đặt</strong>.
                </li>
                <li>
                  Nếu chưa có tài khoản, hãy <strong>đăng ký mới</strong> và dán địa chỉ ví khi đăng ký.
                </li>
              </ul>
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
    </div>
  );
};
