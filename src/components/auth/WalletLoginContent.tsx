import { useState, useEffect } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, CheckCircle2, Loader2 } from 'lucide-react';

interface WalletLoginContentProps {
  onSuccess: (userId: string, isNewUser: boolean) => void;
}

export const WalletLoginContent = ({ onSuccess }: WalletLoginContentProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<'connect' | 'sign' | 'verify'>('connect');
  const [loading, setLoading] = useState(false);

  // Wagmi hooks
  const { address, isConnected, isConnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { disconnect } = useDisconnect();

  // Auto-transition to sign step when connected
  useEffect(() => {
    if (isConnected && address) {
      setStep('sign');
    } else {
      setStep('connect');
    }
  }, [isConnected, address]);

  const handleConnect = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const handleSignAndVerify = async () => {
    if (!address) return;

    setLoading(true);

    try {
      // Generate nonce and message
      const nonce = Math.random().toString(36).substring(2, 15);
      const timestamp = new Date().toISOString();
      const message = `Welcome to FUN Profile!\n\nSign this message to authenticate.\n\nWallet: ${address}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

      // Request signature using wagmi hook
      const signature = await signMessageAsync({ message, account: address });

      setStep('verify');

      // Call sso-web3-auth edge function
      const { data, error } = await supabase.functions.invoke('sso-web3-auth', {
        body: {
          wallet_address: address,
          signature,
          message,
          nonce,
        },
      });

      if (error) throw error;

      if (data?.success && data?.magic_link) {
        // Extract tokens from magic link and set session
        const url = new URL(data.magic_link);
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          // Update last_login_platform to 'FUN Profile'
          await supabase
            .from('profiles')
            .update({ last_login_platform: 'FUN Profile' })
            .eq('id', data.user_id);
        }

        toast.success(data.is_new_user ? t('welcomeNewUser') : t('welcomeBack'));
        onSuccess(data.user_id, data.is_new_user);
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Wallet auth error:', error);
      
      // Handle user rejection
      if (error.name === 'UserRejectedRequestError' || error.message?.includes('rejected')) {
        toast.error('Signature rejected');
      } else {
        toast.error(error.message || t('errorOccurred'));
      }
      
      setStep('sign');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    disconnect();
    setStep('connect');
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isLoading = loading || isConnecting || isSigning;

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
          <img
            src="/fun-profile-logo-40.webp"
            alt="Wallet"
            className="w-12 h-12"
          />
        </div>
      </div>

      {step === 'connect' && (
        <>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-foreground">{t('walletConnect')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('lightCloakDescription')}
            </p>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full h-14 text-lg font-bold rounded-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
              boxShadow: '0 0 30px rgba(245, 158, 11, 0.5), 0 4px 15px rgba(0, 0, 0, 0.2)',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-white">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('walletConnecting')}
                </>
              ) : (
                <>
                  <Wallet size={20} />
                  Connect Wallet
                </>
              )}
            </span>
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            MetaMask, Coinbase Wallet, WalletConnect & more
          </p>
        </>
      )}

      {step === 'sign' && address && (
        <>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2">
              <CheckCircle2 className="text-emerald-600" size={28} />
            </div>
            <p className="text-muted-foreground">{t('walletConnected')}</p>
            <p className="font-mono text-sm bg-muted px-3 py-2 rounded-lg inline-block">
              {shortenAddress(address)}
            </p>
          </div>

          <Button
            onClick={handleSignAndVerify}
            disabled={isLoading}
            className="w-full h-14 text-lg font-bold rounded-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.5), 0 4px 15px rgba(0, 0, 0, 0.2)',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-white">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('walletSigning')}
                </>
              ) : (
                t('walletSign')
              )}
            </span>
          </Button>

          <button
            onClick={handleCancel}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t('cancel')}
          </button>
        </>
      )}

      {step === 'verify' && (
        <div className="text-center space-y-4 py-8">
          <Loader2 className="animate-spin mx-auto text-emerald-500" size={48} />
          <p className="text-muted-foreground font-medium">{t('walletVerifying')}</p>
        </div>
      )}
    </div>
  );
};
