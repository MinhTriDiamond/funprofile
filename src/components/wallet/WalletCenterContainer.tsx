import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet } from 'wagmi/chains';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, AlertTriangle, ChevronDown, CheckCircle2 } from 'lucide-react';

import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { AccountSelectorModal } from './AccountSelectorModal';
import { AccountMismatchModal } from './AccountMismatchModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ReceiveTab } from './ReceiveTab';
import { UnifiedGiftSendDialog } from '@/components/donations/UnifiedGiftSendDialog';
import { ClaimRewardDialog } from './ClaimRewardDialog';
import { WalletCard } from './WalletCard';
import { RewardBreakdown, RewardStats } from './RewardBreakdown';
import { RewardFormulaCard } from './RewardFormulaCard';
import { LightScoreDashboard } from './LightScoreDashboard';
import { DonationHistoryTab } from './DonationHistoryTab';
import { ClaimRewardsSection } from './ClaimRewardsSection';
import { FunBalanceCard } from './FunBalanceCard';
import { ClaimRewardsCard } from './ClaimRewardsCard';
import { ActivateDialog } from './ActivateDialog';
import { ClaimFunDialog } from './ClaimFunDialog';
import { RecentTransactions } from './RecentTransactions';
import { useFunBalance } from '@/hooks/useFunBalance';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useCamlyPrice } from '@/hooks/useCamlyPrice';
import bnbLogo from '@/assets/tokens/bnb-logo.webp';
import { useLanguage } from '@/i18n/LanguageContext';

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  full_name: string | null;
  reward_status?: string;
  admin_notes?: string | null;
}


// Key to track if user explicitly disconnected
const WALLET_DISCONNECTED_KEY = 'fun_profile_wallet_disconnected';

const WalletCenterContainer = () => {
  const { address, isConnected, chainId, connector } = useAccount();
  const { activeAddress, accounts, setActiveAddress } = useActiveAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { t } = useLanguage();
  
  // Modal states cho multi-account
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const [claimableReward, setClaimableReward] = useState(0);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [dailyClaimed, setDailyClaimed] = useState(0);
  const [rewardStats, setRewardStats] = useState<RewardStats | null>(null);
  const [isRewardLoading, setIsRewardLoading] = useState(true);
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showClaimFunDialog, setShowClaimFunDialog] = useState(false);
  const [todayPostCount, setTodayPostCount] = useState(0);
  // Copy state for external wallet
  const [copiedExternal, setCopiedExternal] = useState(false);
  
  // Track if we should show disconnected UI
  const [showDisconnectedUI, setShowDisconnectedUI] = useState(() => {
    return localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true';
  });

  // Ref to track intentional disconnect - prevents effect from clearing showDisconnectedUI
  const intentionalDisconnectRef = useRef(false);

  // Detect connected wallet type
  const connectedWalletType = useMemo(() => {
    if (!connector) return null;
    const name = connector.name.toLowerCase();
    if (name.includes('metamask')) return 'metamask';
    if (name.includes('bitget')) return 'bitget';
    if (name.includes('trust')) return 'trust';
    if (name.includes('fun')) return 'fun';
    return 'other';
  }, [connector]);

  // Get wallet display name
  const getWalletDisplayName = useCallback(() => {
    if (connector?.name) return connector.name;
    switch (connectedWalletType) {
      case 'metamask': return 'MetaMask';
      case 'bitget': return 'Bitget Wallet';
      case 'trust': return 'Trust Wallet';
      case 'fun': return 'FUN Wallet';
      default: return 'External Wallet';
    }
  }, [connector, connectedWalletType]);

  // Use token balances - ưu tiên activeAddress từ multi-account context
  const effectiveAddress = activeAddress as `0x${string}` | undefined;
  const externalAddress = (effectiveAddress || address) as `0x${string}` | undefined;
  const { 
    tokens: externalTokens, 
    totalUsdValue: externalTotalValue, 
    isLoading: isExternalLoading, 
    refetch: refetchExternal 
  } = useTokenBalances({ customAddress: externalAddress });

  // Use FUN balance hook
  const { locked: lockedFun, activated: activatedFun, refetch: refetchFunBalance } = useFunBalance(externalAddress);

  // Get CAMLY price independently (works without wallet connection)
  const { price: camlyPrice } = useCamlyPrice();

  // On mount, disconnect wagmi if user explicitly disconnected before
  useEffect(() => {
    const wasDisconnected = localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true';
    if (wasDisconnected && showDisconnectedUI && isConnected) {
      disconnect();
    }
  }, [isConnected, disconnect, showDisconnectedUI]);

  // When wallet becomes connected, clear disconnected flag
  // BUT skip if user is intentionally disconnecting (race condition protection)
  useEffect(() => {
    if (isConnected && !intentionalDisconnectRef.current) {
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      setShowDisconnectedUI(false);
    }
  }, [isConnected]);

  // Network configuration based on chainId
  const networkConfig = useMemo(() => {
    if (chainId === bscTestnet.id) {
      return {
        name: 'BSC Testnet',
        color: 'bg-orange-400/20 border-orange-400/30 text-white',
        badgeColor: 'bg-orange-100 border-orange-300 text-orange-700',
        isTestnet: true,
      };
    }
    return {
      name: 'BNB Mainnet',
      color: 'bg-yellow-400/20 border-yellow-400/30 text-white',
      badgeColor: 'bg-yellow-100 border-yellow-300 text-yellow-700',
      isTestnet: false,
    };
  }, [chainId]);

  // Switch to Testnet handler
  const handleSwitchToTestnet = useCallback(() => {
    switchChain(
      { chainId: bscTestnet.id },
      {
        onSuccess: () => toast.success(t('walletSwitchedTestnet')),
        onError: () => toast.error(t('walletCannotSwitch')),
      }
    );
  }, [switchChain]);

  // Switch to Mainnet handler
  const handleSwitchToMainnet = useCallback(() => {
    switchChain(
      { chainId: bsc.id },
      {
        onSuccess: () => toast.success(t('walletSwitchedMainnet')),
        onError: () => toast.error(t('walletCannotSwitch')),
      }
    );
  }, [switchChain]);

  // Warn if on unsupported network (not BSC or BSC Testnet)
  useEffect(() => {
    if (isConnected && chainId && chainId !== bsc.id && chainId !== bscTestnet.id) {
      toast.warning(t('walletPleaseSwitch'), {
        action: { label: 'Switch to Mainnet', onClick: handleSwitchToMainnet },
      });
    }
  }, [isConnected, chainId, handleSwitchToMainnet]);

  useEffect(() => {
    fetchProfile();
    fetchClaimableReward();
    fetchTodayPostCount();
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchProfile();
      
      fetchClaimableReward();
      fetchTodayPostCount();
    }
  }, [isConnected, address]);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, cover_url, full_name, reward_status, admin_notes')
        .eq('id', session.user.id)
        .single();
      if (data) setProfile(data as Profile);
    }
  };


  const fetchTodayPostCount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', todayStart.toISOString());
      setTodayPostCount(count || 0);
    }
  };

  const fetchClaimableReward = async () => {
    setIsRewardLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsRewardLoading(false);
        return;
      }

      const userId = session.user.id;
      
      // Gọi RPC để lấy reward đã tính đúng công thức từ database
      const { data: rewardsData, error: rpcError } = await supabase.rpc('get_user_rewards_v2', {
        limit_count: 10000
      });

      if (rpcError) {
        console.error('[WalletCenter] RPC error:', rpcError);
        setIsRewardLoading(false);
        return;
      }

      // Tìm user hiện tại trong kết quả
      const userData = rewardsData?.find((u: any) => u.id === userId);
      
      if (userData) {
        // Lưu chi tiết stats để hiển thị breakdown
        setRewardStats({
          posts_count: Number(userData.posts_count) || 0,
          reactions_on_posts: Number(userData.reactions_on_posts) || 0,
          comments_count: Number(userData.comments_count) || 0,
          shares_count: Number(userData.shares_count) || 0,
          friends_count: Number(userData.friends_count) || 0,
          livestreams_count: Number(userData.livestreams_count) || 0,
          total_reward: Number(userData.total_reward) || 0,
          today_reward: Number(userData.today_reward) || 0,
        });

        const totalReward = Number(userData.total_reward) || 0;

        // Lấy số đã claimed
        const { data: claims } = await supabase
          .from('reward_claims')
          .select('amount, created_at')
          .eq('user_id', userId);
          
        const claimed = claims?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        setClaimedAmount(claimed);
        setClaimableReward(Math.max(0, totalReward - claimed));

        // Tính daily claimed (hôm nay UTC)
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayCl = claims?.filter(c => new Date(c.created_at) >= todayStart)
          .reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        setDailyClaimed(todayCl);
      } else {
        // User mới chưa có trong bảng xếp hạng
        setRewardStats({
          posts_count: 0,
          reactions_on_posts: 0,
          comments_count: 0,
          shares_count: 0,
          friends_count: 0,
          livestreams_count: 0,
          total_reward: 50000, // Bonus đăng ký mới
          today_reward: 0,
        });
        setClaimableReward(50000);
        setClaimedAmount(0);
        setDailyClaimed(0);
      }
    } catch (error) {
      console.error('[WalletCenter] fetchClaimableReward error:', error);
    } finally {
      setIsRewardLoading(false);
    }
  };

  const handleConnect = useCallback(() => {
    intentionalDisconnectRef.current = false;
    setShowDisconnectedUI(false);
    localStorage.removeItem(WALLET_DISCONNECTED_KEY);
    if (openConnectModal) {
      openConnectModal();
    } else {
      toast.error(t('walletCannotOpenConnect'));
    }
  }, [openConnectModal]);

  // Mở modal chọn tài khoản thay vì gọi wallet_requestPermissions
  const handleSwitchAccount = useCallback(() => {
    if (accounts.length > 1) {
      setShowAccountSelector(true);
    } else {
      // Nếu chỉ có 1 account, mở modal vẫn được (hiển thị thông tin)
      setShowAccountSelector(true);
    }
  }, [accounts]);

  // Phát hiện mismatch giữa provider address và active address
  useEffect(() => {
    if (
      isConnected &&
      activeAddress &&
      address &&
      activeAddress.toLowerCase() !== address.toLowerCase()
    ) {
      setShowMismatchModal(true);
    }
  }, [isConnected, activeAddress, address]);

  const handleDisconnect = useCallback(() => {
    // Mark as intentional disconnect BEFORE calling disconnect()
    intentionalDisconnectRef.current = true;
    localStorage.setItem(WALLET_DISCONNECTED_KEY, 'true');
    setShowDisconnectedUI(true);
    
    // Cleanup wagmi localStorage to prevent auto-reconnect
    try {
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.wallet');
      localStorage.removeItem('wagmi.recentConnectorId');
      // Clean WalletConnect sessions
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wc@') || key.startsWith('walletconnect')) {
          localStorage.removeItem(key);
        }
      });
      // Clean ActiveAccount context keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('activeAccount:') || key.startsWith('lastUsedAt:')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('[WalletCenter] localStorage cleanup error:', e);
    }
    
    disconnect();
    toast.success(t('walletDisconnected'));
  }, [disconnect]);

  // Legacy switch network handler (kept for compatibility)
  const handleSwitchNetwork = useCallback(() => {
    handleSwitchToMainnet();
  }, [handleSwitchToMainnet]);

  // Copy handler
  const copyExternalAddress = useCallback(() => {
    const addr = address;
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopiedExternal(true);
      toast.success(t('walletAddressCopied'));
      setTimeout(() => setCopiedExternal(false), 2000);
    }
  }, [address]);

  // Format helpers
  const formatNumber = (num: number, decimals: number = 0) => {
    const fixed = num.toFixed(decimals);
    const [integerPart, decimalPart] = fixed.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (decimals > 0 && decimalPart) return `${formattedInteger},${decimalPart}`;
    return formattedInteger;
  };

  const formatUsd = (num: number) => `$${formatNumber(num, 2)}`;

  // Has any wallet?
  const hasAnyWallet = useMemo(() => {
    return !!isConnected;
  }, [isConnected]);

  // Show connect wallet screen if no wallet at all
  if (!isConnected && showDisconnectedUI) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-600 to-green-500 p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-yellow-400 drop-shadow-lg">{t('walletMyWallet')}</h1>
              <div className="flex items-center gap-2 bg-yellow-400/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-yellow-400/30">
                <img src={bnbLogo} alt="BNB" className="w-5 h-5" />
                <span className="text-sm font-medium text-white">BNB Smart Chain</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Wallet Card */}
        <div className="bg-white/80 rounded-2xl shadow-lg p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <Wallet className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">{t('walletConnectToContinue')}</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {t('walletConnectDesc')}
          </p>
          
          <Button
            onClick={handleConnect}
            className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-yellow-300 font-bold text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-green-500/40 transition-all duration-300 hover:scale-105"
          >
            <Wallet className="w-6 h-6 mr-2" />
            {t('walletConnectWallet')}
          </Button>
        </div>
      </div>
    );
  }

  // Main wallet UI - single column layout
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white/80 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-white">
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('walletMyWallet')}</h1>
              <p className="text-sm text-muted-foreground">{profile?.display_name || profile?.username || 'Account'}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${networkConfig.badgeColor} hover:opacity-80 transition-opacity cursor-pointer`}>
                <img src={bnbLogo} alt="BNB" className="w-5 h-5" />
                <span className="text-sm font-medium">{networkConfig.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white/90 z-50">
              <DropdownMenuItem 
                onClick={handleSwitchToMainnet}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>BNB Mainnet (56)</span>
                {chainId === bsc.id && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleSwitchToTestnet}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>BSC Testnet (97)</span>
                {chainId === bscTestnet.id && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Testnet Warning Banner */}
      {chainId === bscTestnet.id && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
          <span className="text-sm text-orange-700">
            {t('walletTestnetWarning')}
          </span>
        </div>
      )}

      {/* Single Column Layout - External Wallet Only */}
      <div className="w-full">
        <WalletCard
          walletAddress={activeAddress || address || null}
          walletName={getWalletDisplayName()}
          connectorType={connectedWalletType}
          isConnected={isConnected}
          accountCount={accounts.length}
          tokens={externalTokens}
          totalUsdValue={externalTotalValue}
          isTokensLoading={isExternalLoading}
          copied={copiedExternal}
          onCopy={copyExternalAddress}
          onRefresh={refetchExternal}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onSwitchAccount={handleSwitchAccount}
          onReceive={() => setShowReceive(true)}
          onSend={() => setShowSend(true)}
          onSwap={() => window.open('https://pancakeswap.finance/swap', '_blank')}
          onBuy={() => window.open('https://www.moonpay.com/buy', '_blank')}
        />
      </div>

      {/* Claim Rewards Section */}
      <ClaimRewardsSection
        claimableReward={claimableReward}
        claimedAmount={claimedAmount}
        dailyClaimed={dailyClaimed}
        rewardStats={rewardStats}
        camlyPrice={camlyPrice}
        isConnected={isConnected}
        rewardStatus={profile?.reward_status || 'pending'}
        adminNotes={profile?.admin_notes}
        isLoading={isRewardLoading}
        hasAvatar={!!profile?.avatar_url}
        hasCover={!!profile?.cover_url}
        hasTodayPost={todayPostCount > 0}
        hasFullName={(() => {
          const fn = (profile?.full_name || '').trim();
          return fn.length >= 4 && !/^\d+$/.test(fn) && /[a-zA-ZÀ-ỹ]/.test(fn);
        })()}
        onClaimClick={() => setShowClaimDialog(true)}
        onConnectClick={handleConnect}
      />

      {/* Reward Breakdown - Chi tiết thưởng */}
      <RewardBreakdown 
        stats={rewardStats} 
        claimedAmount={claimedAmount} 
        isLoading={isRewardLoading} 
      />

      {/* Reward Formula Card - Công thức tính thưởng */}
      <RewardFormulaCard defaultOpen={false} />

      {/* PPLP Light Score Dashboard */}
      <LightScoreDashboard />

      {/* FUN Money Balance Card */}
      {externalAddress && (
        <FunBalanceCard
          walletAddress={externalAddress}
          onActivate={() => setShowActivateDialog(true)}
          onClaim={() => setShowClaimFunDialog(true)}
        />
      )}

      {/* Claim FUN Rewards Card */}
      <ClaimRewardsCard 
        onClaimSuccess={() => {
          refetchFunBalance();
        }}
      />

      {/* Recent Transactions */}
      <RecentTransactions />

      {/* Donation History */}
      <DonationHistoryTab />

      {/* Receive Dialog */}
      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('walletReceiveMoney')}</DialogTitle>
          </DialogHeader>
          <ReceiveTab 
            walletAddress={address || undefined} 
          />
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <UnifiedGiftSendDialog
        isOpen={showSend}
        onClose={() => setShowSend(false)}
        mode="wallet"
        onSuccess={() => { refetchExternal(); fetchClaimableReward(); }}
      />

      {/* Claim Reward Dialog */}
      <ClaimRewardDialog
        open={showClaimDialog}
        onOpenChange={setShowClaimDialog}
        claimableAmount={claimableReward}
        externalWallet={(isConnected ? address : null) || null}
        camlyPrice={camlyPrice}
        dailyClaimed={dailyClaimed}
        onSuccess={() => {
          fetchClaimableReward();
          refetchExternal();
        }}
      />

      {/* Activate FUN Dialog */}
      <ActivateDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        lockedBalance={lockedFun}
        onSuccess={() => {
          refetchFunBalance();
          refetchExternal();
        }}
      />

      {/* Claim FUN Dialog */}
      <ClaimFunDialog
        open={showClaimFunDialog}
        onOpenChange={setShowClaimFunDialog}
        activatedBalance={activatedFun}
        onSuccess={() => {
          refetchFunBalance();
          refetchExternal();
        }}
      />

      {/* Account Selector Modal (multi-account) */}
      <AccountSelectorModal
        open={showAccountSelector}
        onOpenChange={setShowAccountSelector}
      />

      {/* Account Mismatch Modal */}
      <AccountMismatchModal
        open={showMismatchModal}
        onOpenChange={setShowMismatchModal}
      />
    </div>
  );
};

export default WalletCenterContainer;
