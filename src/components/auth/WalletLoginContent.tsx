/**
 * WalletLoginContent — Full mobile-optimized wallet login UI
 * Features: Step progress, deep links, dApp browser detection, pending sign handling
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Wallet, CheckCircle2, Loader2, Mail, ShieldAlert,
  AlertCircle, ExternalLink, RefreshCw, ArrowLeft,
} from 'lucide-react';
import { useWalletAuth, type WalletLoginResult } from '@/hooks/useWalletAuth';
import {
  isMobileDevice,
  isMetaMaskMobileBrowser,
  isTrustWalletMobileBrowser,
  isBitgetMobileBrowser,
  isInjectedMobileBrowser,
  getMetaMaskDeepLink,
  getTrustWalletDeepLink,
  getBitgetDeepLink,
  getChainName,
} from '@/utils/mobileWalletConnect';
import { useState } from 'react';

interface WalletLoginContentProps {
  onSuccess: (userId: string, isNewUser: boolean) => void;
}

// ─── Step Progress Bar ───

const STEPS = [
  { key: 'connect', label: 'Kết nối' },
  { key: 'network', label: 'Mạng' },
  { key: 'sign', label: 'Ký' },
  { key: 'done', label: 'Xong' },
] as const;

function getActiveStep(phase: string) {
  switch (phase) {
    case 'idle': case 'connecting': return 0;
    case 'connected': case 'wrong_chain': return 1;
    case 'ready_to_sign': case 'signing': case 'signing_pending_wallet':
    case 'verifying': case 'error': return 2;
    case 'authenticated': return 3;
    default: return 0;
  }
}

function StepProgressBar({ phase }: { phase: string }) {
  const activeStep = getActiveStep(phase);
  return (
    <div className="flex items-center justify-between gap-1 px-2 mb-4">
      {STEPS.map((step, index) => {
        const isActive = index === activeStep;
        const isDone = index < activeStep;
        return (
          <div key={step.key} className="flex flex-col items-center flex-1 gap-1">
            <div
              className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                isDone ? 'bg-emerald-500' : isActive ? 'bg-emerald-400' : 'bg-muted'
              }`}
            />
            <span className={`text-[10px] font-medium ${
              isDone ? 'text-emerald-500' : isActive ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───

export const WalletLoginContent = ({ onSuccess }: WalletLoginContentProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { openConnectModal } = useConnectModal();
  const auth = useWalletAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);

  const isMobile = isMobileDevice();
  const inMetaMaskMobile = isMetaMaskMobileBrowser();
  const inTrustWalletMobile = isTrustWalletMobileBrowser();
  const inBitgetMobile = isBitgetMobileBrowser();
  const inInjectedMobileBrowser = isInjectedMobileBrowser();

  const shortAddr = auth.connectedAddress
    ? `${auth.connectedAddress.slice(0, 6)}...${auth.connectedAddress.slice(-4)}`
    : '';

  const helperText = useMemo(() => {
    if (auth.phase === 'connecting') {
      return inMetaMaskMobile
        ? 'Bạn đang ở trong MetaMask. Hãy kết nối ví để tiếp tục.'
        : inTrustWalletMobile
        ? 'Bạn đang ở trong Trust Wallet. Hãy kết nối ví để tiếp tục.'
        : inBitgetMobile
        ? 'Bạn đang ở trong Bitget Wallet. Hãy kết nối ví để tiếp tục.'
        : 'Đang kết nối ví...';
    }
    if (auth.phase === 'signing') {
      return auth.wasBackgroundedDuringSign
        ? 'Vui lòng xác nhận chữ ký trong ví của bạn.'
        : 'Đang mở ví để xác nhận...';
    }
    if (auth.phase === 'signing_pending_wallet' || auth.pendingRequestDetected) {
      return 'Yêu cầu ký đang chờ xử lý trong ví. Vui lòng mở lại cửa sổ xác nhận trong ví để tiếp tục.';
    }
    if (auth.phase === 'verifying') {
      return 'Đang xác thực chữ ký và tạo phiên đăng nhập...';
    }
    return null;
  }, [auth.phase, auth.wasBackgroundedDuringSign, auth.pendingRequestDetected, inMetaMaskMobile, inTrustWalletMobile, inBitgetMobile]);

  // ─── Handlers ───

  const handleConnectInjected = async () => {
    try {
      await auth.connectWallet();
      toast.success(inMetaMaskMobile ? 'Đã kết nối MetaMask.' : inTrustWalletMobile ? 'Đã kết nối Trust Wallet.' : inBitgetMobile ? 'Đã kết nối Bitget.' : 'Đã kết nối ví.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể kết nối ví.');
    }
  };

  const handleLogin = async () => {
    try {
      const result: WalletLoginResult = await auth.startWalletLoginFlow();
      toast.success('Đăng nhập ví thành công.');
      if (result.isNewUser) {
        setNewUserId(result.user_id);
        setShowOnboarding(true);
      } else {
        toast.success(t('welcomeBack'));
      }
      onSuccess(result.user_id, result.isNewUser);
    } catch (error: any) {
      if (auth.phase === 'signing_pending_wallet' || auth.pendingRequestDetected) {
        toast.warning('Yêu cầu ký đang chờ xử lý. Vui lòng mở lại ví.');
        return;
      }
      toast.error(error?.message || 'Không thể đăng nhập bằng ví.');
    }
  };

  const handleRetry = async () => {
    try {
      const result = await auth.retryCurrentStep();
      if (result) {
        toast.success('Đăng nhập ví thành công.');
        if (result.isNewUser) { setNewUserId(result.user_id); setShowOnboarding(true); }
        onSuccess(result.user_id, result.isNewUser);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Không thể thử lại.');
    }
  };

  const handleResumeCheck = async () => {
    try {
      const result = await auth.resumePendingFlowCheck();
      if (result) {
        toast.success('Đăng nhập ví thành công.');
        if (result.isNewUser) { setNewUserId(result.user_id); setShowOnboarding(true); }
        onSuccess(result.user_id, result.isNewUser);
      } else {
        toast.info('Vui lòng xác nhận chữ ký trong ví của bạn.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Không thể kiểm tra lại.');
    }
  };

  const handleSwitchWallet = async () => {
    try {
      const result = await auth.switchWalletAccount();
      if (result.cancelled) { toast.info('Bạn đã hủy chọn ví.'); return; }
      if (result.switched) { toast.success('Đã chuyển sang ví mới.'); return; }
      if (result.fallbackUsed) { toast('Vui lòng chọn tài khoản khác trong ví rồi quay lại.', { duration: 6000 }); return; }
    } catch (error: any) {
      toast.error(error?.message || 'Không thể đổi ví.');
    }
  };

  // ─── Render: Idle / Connecting ───

  if (auth.phase === 'idle' || auth.phase === 'connecting') {
    // Inside dApp browser (MetaMask / Trust / Bitget)
    if (inInjectedMobileBrowser) {
      return (
        <div className="space-y-4">
          <StepProgressBar phase={auth.phase} />
          <p className="text-sm text-muted-foreground text-center">
            {inMetaMaskMobile ? 'Bạn đang ở trong MetaMask.' : inTrustWalletMobile ? 'Bạn đang ở trong Trust Wallet.' : 'Bạn đang ở trong Bitget Wallet.'} Hãy kết nối ví để tiếp tục.
          </p>
          <Button
            onClick={() => void handleConnectInjected()}
            disabled={auth.phase === 'connecting'}
            className="w-full h-12 rounded-full font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #166534 100%)' }}
          >
            {auth.phase === 'connecting' ? (
              <><Loader2 className="mr-2 animate-spin" size={16} /> Đang kết nối...</>
            ) : (
              <><Wallet className="mr-2" size={16} /> {inMetaMaskMobile ? 'Kết nối MetaMask' : inTrustWalletMobile ? 'Kết nối Trust Wallet' : 'Kết nối Bitget'}</>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Không cần mở lại ứng dụng. Bạn đã ở trong trình duyệt ví.</p>
        </div>
      );
    }

    // Standard flow (desktop or mobile without dApp browser)
    return (
      <div className="space-y-4">
        <StepProgressBar phase={auth.phase} />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-foreground">{t('walletConnect')}</h3>
          <p className="text-sm text-muted-foreground">
            {isMobile ? 'Mở ứng dụng ví hoặc quét QR để kết nối' : 'Kết nối ví để đăng nhập hoặc tạo tài khoản'}
          </p>
        </div>

        {isMobile && (
          <div className="space-y-2">
            <a href={getMetaMaskDeepLink()} className="block">
              <Button variant="outline" className="w-full h-11 justify-between rounded-full">
                <span className="flex items-center gap-2"><Wallet size={16} /> Mở trong MetaMask</span>
                <ExternalLink size={14} className="text-muted-foreground" />
              </Button>
            </a>
            <a href={getTrustWalletDeepLink()} className="block">
              <Button variant="outline" className="w-full h-11 justify-between rounded-full">
                <span className="flex items-center gap-2"><Wallet size={16} /> Mở trong Trust Wallet</span>
                <ExternalLink size={14} className="text-muted-foreground" />
              </Button>
            </a>
            <a href={getBitgetDeepLink()} className="block">
              <Button variant="outline" className="w-full h-11 justify-between rounded-full">
                <span className="flex items-center gap-2"><Wallet size={16} /> Mở trong Bitget Wallet</span>
                <ExternalLink size={14} className="text-muted-foreground" />
              </Button>
            </a>
          </div>
        )}

        <Button
          onClick={() => {
            if (openConnectModal) openConnectModal();
            else void auth.connectWallet();
          }}
          disabled={auth.phase === 'connecting'}
          className="w-full h-12 rounded-full font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #166534 100%)', boxShadow: '0 4px 20px rgba(22, 101, 52, 0.4)' }}
        >
          {auth.phase === 'connecting' ? (
            <><Loader2 className="mr-2 animate-spin" size={16} /> Đang kết nối...</>
          ) : (
            <><Wallet className="mr-2" size={16} /> Kết nối ví / Connect Wallet</>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          MetaMask, Trust Wallet, Bitget Wallet, WalletConnect và các ví khác
        </p>
      </div>
    );
  }

  // ─── Render: Wrong Chain ───

  if (auth.phase === 'wrong_chain') {
    return (
      <div className="space-y-4">
        <StepProgressBar phase={auth.phase} />
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle size={18} className="shrink-0" />
          <span>Vui lòng chuyển sang <strong>BNB Smart Chain</strong> để tiếp tục.</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Wallet size={16} className="shrink-0 text-muted-foreground" />
          <span className="text-sm font-mono truncate">{shortAddr}</span>
        </div>
        <Button
          onClick={() => void auth.ensureSupportedChain()}
          disabled={auth.isSwitchingChain}
          className="w-full h-11 rounded-full font-bold"
        >
          {auth.isSwitchingChain ? (
            <><Loader2 className="mr-2 animate-spin" size={16} /> Đang chuyển mạng...</>
          ) : (
            'Chuyển sang BNB Smart Chain'
          )}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={() => void handleSwitchWallet()} disabled={auth.isSwitchingWallet}>
            <RefreshCw size={14} className="mr-1" /> Đổi ví khác
          </Button>
        </div>
        <button onClick={() => void auth.disconnectWallet()} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          Ngắt kết nối
        </button>
      </div>
    );
  }

  // ─── Render: Signing / Pending / Verifying ───

  if (auth.phase === 'signing' || auth.phase === 'signing_pending_wallet' || auth.phase === 'verifying') {
    return (
      <div className="space-y-4">
        <StepProgressBar phase={auth.phase} />
        <div className="text-center py-4">
          <Loader2 className="animate-spin mx-auto text-emerald-500 mb-3" size={40} />
          {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
          {auth.phase === 'signing_pending_wallet' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              MetaMask vẫn đang giữ yêu cầu ký trước đó. Đừng bấm ký nhiều lần. Hãy quay lại cửa sổ xác nhận trong ví.
            </p>
          )}
        </div>

        {isMobile && (auth.phase === 'signing' || auth.phase === 'signing_pending_wallet') && (
          <div className="space-y-2">
            <a href={getMetaMaskDeepLink()} className="block">
              <Button variant="outline" size="sm" className="w-full rounded-full">
                <Wallet size={14} className="mr-1" /> Mở lại MetaMask
              </Button>
            </a>
            {!inMetaMaskMobile && (
              <a href={getTrustWalletDeepLink()} className="block">
                <Button variant="outline" size="sm" className="w-full rounded-full">
                  <Wallet size={14} className="mr-1" /> Mở lại Trust Wallet
                </Button>
              </a>
            )}
            {!inMetaMaskMobile && !inTrustWalletMobile && (
              <a href={getBitgetDeepLink()} className="block">
                <Button variant="outline" size="sm" className="w-full rounded-full">
                  <Wallet size={14} className="mr-1" /> Mở lại Bitget
                </Button>
              </a>
            )}
          </div>
        )}

        <Button onClick={() => void handleResumeCheck()} variant="secondary" className="w-full rounded-full">
          Tôi đã xác nhận
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={() => void handleSwitchWallet()} disabled={auth.isSwitchingWallet}>
            Đổi ví khác
          </Button>
        </div>

        <button onClick={() => void auth.disconnectWallet()} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          Ngắt kết nối
        </button>

        <button onClick={() => auth.resetWalletAuthFlow('retry')} className="flex items-center justify-center gap-1 w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={12} /> Quay lại
        </button>
      </div>
    );
  }

  // ─── Render: Authenticated ───

  if (auth.phase === 'authenticated') {
    return (
      <div className="space-y-4">
        <StepProgressBar phase={auth.phase} />
        <div className="text-center py-4">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={40} />
          <p className="text-sm font-medium text-foreground">Đăng nhập ví thành công.</p>
        </div>
      </div>
    );
  }

  // ─── Render: Error ───

  if (auth.phase === 'error') {
    return (
      <div className="space-y-4">
        <StepProgressBar phase={auth.phase} />
        <div className="text-center py-4">
          <AlertCircle className="mx-auto text-destructive mb-2" size={40} />
          <p className="text-sm font-medium text-destructive">Xác thực thất bại</p>
          {auth.error?.message && <p className="text-xs text-muted-foreground mt-1">{auth.error.message}</p>}
        </div>

        {auth.pendingRequestDetected ? (
          <div className="space-y-2">
            <Button onClick={() => void handleResumeCheck()} className="w-full rounded-full">Kiểm tra lại</Button>
            <Button variant="outline" onClick={() => void handleSwitchWallet()} disabled={auth.isSwitchingWallet} className="w-full rounded-full">
              Đổi ví khác
            </Button>
          </div>
        ) : (
          <Button onClick={() => void handleRetry()} disabled={auth.isSigning || auth.isVerifying} className="w-full rounded-full">
            Thử lại
          </Button>
        )}

        <button onClick={() => void auth.disconnectWallet()} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          Ngắt kết nối
        </button>
      </div>
    );
  }

  // ─── Render: Connected (ready to sign) ───

  return (
    <div className="space-y-4">
      <StepProgressBar phase={auth.phase} />

      <div className="flex items-center gap-2 rounded-lg border p-3">
        <Wallet size={16} className="shrink-0 text-muted-foreground" />
        <span className="text-sm font-mono truncate flex-1">{shortAddr}</span>
        <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Mạng: <strong className="text-foreground">{getChainName(auth.chainId)}</strong>
      </div>

      <Button
        onClick={() => void handleLogin()}
        disabled={auth.isSigning || auth.isVerifying}
        className="w-full h-12 rounded-full font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #166534 100%)', boxShadow: '0 4px 20px rgba(22, 101, 52, 0.4)' }}
      >
        {auth.isSigning || auth.isVerifying ? 'Đang xử lý...' : 'Ký và đăng nhập'}
      </Button>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={() => void handleSwitchWallet()} disabled={auth.isSwitchingWallet}>
          <RefreshCw size={14} className="mr-1" /> Đổi ví khác
        </Button>
      </div>

      <button onClick={() => void auth.disconnectWallet()} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        Ngắt kết nối
      </button>

      {/* Onboarding Dialog for new users */}
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
            <Button onClick={() => { setShowOnboarding(false); navigate('/settings/security'); }} className="w-full">
              <Mail className="w-4 h-4 mr-2" /> Liên kết email ngay
            </Button>
            <Button variant="ghost" onClick={() => setShowOnboarding(false)} className="w-full text-muted-foreground">
              Để sau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
