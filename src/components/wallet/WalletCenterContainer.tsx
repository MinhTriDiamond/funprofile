import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet } from 'wagmi/chains';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

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
import { RewardStats } from './RewardBreakdown';
import { ActivateDialog } from './ActivateDialog';
import { ClaimFunDialog } from './ClaimFunDialog';
import { useFunBalance } from '@/hooks/useFunBalance';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useCamlyPrice } from '@/hooks/useCamlyPrice';
import bnbLogo from '@/assets/tokens/bnb-logo.webp';
import { useLanguage } from '@/i18n/LanguageContext';

// Tab components
import { AssetTab } from './tabs/AssetTab';
import { RewardTab } from './tabs/RewardTab';
import { FunMoneyTab } from './tabs/FunMoneyTab';
import { HistoryTab } from './tabs/HistoryTab';

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  full_name: string | null;
  reward_status?: string;
  admin_notes?: string | null;
}

// Tab configuration
const WALLET_TABS = [
  { id: 'asset', label: 'Tài Sản', path: '/wallet/asset' },
  { id: 'reward', label: 'Phần Thưởng', path: '/wallet/reward' },
  { id: 'fun_money', label: 'Mint Fun Money', path: '/wallet/fun_money' },
  { id: 'history', label: 'Lịch Sử', path: '/wallet/history' },
] as const;

const WALLET_DISCONNECTED_KEY = 'fun_profile_wallet_disconnected';

const WalletCenterContainer = () => {
  const { address, isConnected, chainId, connector } = useAccount();
  const { activeAddress, accounts, setActiveAddress } = useActiveAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
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
  const [copiedExternal, setCopiedExternal] = useState(false);
  
  const [showDisconnectedUI, setShowDisconnectedUI] = useState(() => {
    return localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true';
  });
  const intentionalDisconnectRef = useRef(false);

  // Active tab from route
  const activeTab = useMemo(() => {
    const path = location.pathname;
    const tab = WALLET_TABS.find(t => path.startsWith(t.path));
    return tab?.id || 'asset';
  }, [location.pathname]);

  // Redirect /wallet to /wallet/asset
  useEffect(() => {
    if (location.pathname === '/wallet' || location.pathname === '/wallet/') {
      navigate('/wallet/asset', { replace: true });
    }
  }, [location.pathname, navigate]);

  const connectedWalletType = useMemo(() => {
    if (!connector) return null;
    const name = connector.name.toLowerCase();
    if (name.includes('metamask')) return 'metamask' as const;
    if (name.includes('bitget')) return 'bitget' as const;
    if (name.includes('trust')) return 'trust' as const;
    if (name.includes('fun')) return 'fun' as const;
    return 'other' as const;
  }, [connector]);

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

  const effectiveAddress = activeAddress as `0x${string}` | undefined;
  const externalAddress = (effectiveAddress || address) as `0x${string}` | undefined;
  const { 
    tokens: externalTokens, 
    totalUsdValue: externalTotalValue, 
    isLoading: isExternalLoading, 
    refetch: refetchExternal 
  } = useTokenBalances({ customAddress: externalAddress });

  const { locked: lockedFun, activated: activatedFun, refetch: refetchFunBalance } = useFunBalance(externalAddress);
  const { price: camlyPrice } = useCamlyPrice();

  useEffect(() => {
    const wasDisconnected = localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true';
    if (wasDisconnected && showDisconnectedUI && isConnected) {
      disconnect();
    }
  }, [isConnected, disconnect, showDisconnectedUI]);

  useEffect(() => {
    if (isConnected && !intentionalDisconnectRef.current) {
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      setShowDisconnectedUI(false);
    }
  }, [isConnected]);

  const networkConfig = useMemo(() => {
    if (chainId === bscTestnet.id) {
      return {
        name: 'BSC Testnet',
        badgeColor: 'bg-orange-100 border-orange-300 text-orange-700',
        isTestnet: true,
      };
    }
    return {
      name: 'BNB Mainnet',
      badgeColor: 'bg-yellow-100 border-yellow-300 text-yellow-700',
      isTestnet: false,
    };
  }, [chainId]);

  const handleSwitchToTestnet = useCallback(() => {
    switchChain(
      { chainId: bscTestnet.id },
      {
        onSuccess: () => toast.success(t('walletSwitchedTestnet')),
        onError: () => toast.error(t('walletCannotSwitch')),
      }
    );
  }, [switchChain]);

  const handleSwitchToMainnet = useCallback(() => {
    switchChain(
      { chainId: bsc.id },
      {
        onSuccess: () => toast.success(t('walletSwitchedMainnet')),
        onError: () => toast.error(t('walletCannotSwitch')),
      }
    );
  }, [switchChain]);

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
      if (!session?.user) { setIsRewardLoading(false); return; }

      const userId = session.user.id;
      const { data: rewardsData, error: rpcError } = await supabase.rpc('get_user_rewards_v2', { limit_count: 10000 });

      if (rpcError) { console.error('[WalletCenter] RPC error:', rpcError); setIsRewardLoading(false); return; }

      const userData = rewardsData?.find((u: any) => u.id === userId);
      
      if (userData) {
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
        const { data: claims } = await supabase.from('reward_claims').select('amount, created_at').eq('user_id', userId);
        const claimed = claims?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        setClaimedAmount(claimed);
        setClaimableReward(Math.max(0, totalReward - claimed));
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayCl = claims?.filter(c => new Date(c.created_at) >= todayStart).reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        setDailyClaimed(todayCl);
      } else {
        setRewardStats({ posts_count: 0, reactions_on_posts: 0, comments_count: 0, shares_count: 0, friends_count: 0, livestreams_count: 0, total_reward: 50000, today_reward: 0 });
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
    if (openConnectModal) { openConnectModal(); } else { toast.error(t('walletCannotOpenConnect')); }
  }, [openConnectModal]);

  const handleSwitchAccount = useCallback(() => { setShowAccountSelector(true); }, []);

  useEffect(() => {
    if (isConnected && activeAddress && address && activeAddress.toLowerCase() !== address.toLowerCase()) {
      setShowMismatchModal(true);
    }
  }, [isConnected, activeAddress, address]);

  const handleDisconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    localStorage.setItem(WALLET_DISCONNECTED_KEY, 'true');
    setShowDisconnectedUI(true);
    try {
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.wallet');
      localStorage.removeItem('wagmi.recentConnectorId');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wc@') || key.startsWith('walletconnect')) localStorage.removeItem(key);
      });
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('activeAccount:') || key.startsWith('lastUsedAt:')) localStorage.removeItem(key);
      });
    } catch (e) { console.warn('[WalletCenter] localStorage cleanup error:', e); }
    disconnect();
    toast.success(t('walletDisconnected'));
  }, [disconnect]);

  const copyExternalAddress = useCallback(() => {
    const addr = address;
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopiedExternal(true);
      toast.success(t('walletAddressCopied'));
      setTimeout(() => setCopiedExternal(false), 2000);
    }
  }, [address]);

  // Disconnected UI
  if (!isConnected && showDisconnectedUI) {
    return (
      <div className="space-y-6">
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
        <div className="bg-white/80 rounded-2xl shadow-lg p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <Wallet className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">{t('walletConnectToContinue')}</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t('walletConnectDesc')}</p>
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

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'asset':
        return (
          <AssetTab
            walletAddress={activeAddress || address || null}
            walletName={getWalletDisplayName()}
            connectorType={connectedWalletType}
            isConnected={isConnected}
            accountCount={accounts.length}
            tokens={externalTokens}
            totalUsdValue={externalTotalValue}
            isTokensLoading={isExternalLoading}
            copied={copiedExternal}
            chainId={chainId}
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
        );
      case 'reward':
        return (
          <RewardTab
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
        );
      case 'fun_money':
        return (
          <FunMoneyTab
            externalAddress={externalAddress}
            onActivate={() => setShowActivateDialog(true)}
            onClaim={() => setShowClaimFunDialog(true)}
            onClaimSuccess={() => { refetchFunBalance(); }}
          />
        );
      case 'history':
        return <HistoryTab />;
      default:
        return null;
    }
  };

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
              <DropdownMenuItem onClick={handleSwitchToMainnet} className="flex items-center justify-between cursor-pointer">
                <span>BNB Mainnet (56)</span>
                {chainId === bsc.id && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSwitchToTestnet} className="flex items-center justify-between cursor-pointer">
                <span>BSC Testnet (97)</span>
                {chainId === bscTestnet.id && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide">
          {WALLET_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex-shrink-0 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Dialogs */}
      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('walletReceiveMoney')}</DialogTitle>
          </DialogHeader>
          <ReceiveTab walletAddress={address || undefined} />
        </DialogContent>
      </Dialog>

      <UnifiedGiftSendDialog
        isOpen={showSend}
        onClose={() => setShowSend(false)}
        mode="wallet"
        onSuccess={() => { refetchExternal(); fetchClaimableReward(); }}
      />

      <ClaimRewardDialog
        open={showClaimDialog}
        onOpenChange={setShowClaimDialog}
        claimableAmount={claimableReward}
        externalWallet={(isConnected ? address : null) || null}
        camlyPrice={camlyPrice}
        dailyClaimed={dailyClaimed}
        onSuccess={() => { fetchClaimableReward(); refetchExternal(); }}
      />

      <ActivateDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        lockedBalance={lockedFun}
        onSuccess={() => { refetchFunBalance(); refetchExternal(); }}
      />

      <ClaimFunDialog
        open={showClaimFunDialog}
        onOpenChange={setShowClaimFunDialog}
        activatedBalance={activatedFun}
        onSuccess={() => { refetchFunBalance(); refetchExternal(); }}
      />

      <AccountSelectorModal open={showAccountSelector} onOpenChange={setShowAccountSelector} />
      <AccountMismatchModal open={showMismatchModal} onOpenChange={setShowMismatchModal} />
    </div>
  );
};

export default WalletCenterContainer;
