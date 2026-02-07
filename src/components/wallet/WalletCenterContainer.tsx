import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useDisconnect, useSwitchChain, useSignMessage } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { bsc } from 'wagmi/chains';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gift, Wallet, Info, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ReceiveTab } from './ReceiveTab';
import { SendTab } from './SendTab';
import { ClaimRewardDialog } from './ClaimRewardDialog';
import { WalletCard } from './WalletCard';
import { RewardBreakdown, RewardStats } from './RewardBreakdown';
import { RewardFormulaCard } from './RewardFormulaCard';
import { LightScoreDashboard } from './LightScoreDashboard';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import bnbLogo from '@/assets/tokens/bnb-logo.webp';

interface Profile {
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  reward_status?: string;
  admin_notes?: string | null;
}

interface WalletProfile {
  external_wallet_address: string | null;
  custodial_wallet_address: string | null;
  default_wallet_type: 'custodial' | 'external' | null;
}

// Key to track if user explicitly disconnected
const WALLET_DISCONNECTED_KEY = 'fun_profile_wallet_disconnected';

const WalletCenterContainer = () => {
  const { address, isConnected, chainId, connector } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync, isPending: isSigningMessage } = useSignMessage();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [walletProfile, setWalletProfile] = useState<WalletProfile | null>(null);
  const [walletProfileFetched, setWalletProfileFetched] = useState(false);
  const [claimableReward, setClaimableReward] = useState(0);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [rewardStats, setRewardStats] = useState<RewardStats | null>(null);
  const [isRewardLoading, setIsRewardLoading] = useState(true);
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  
  // Copy state for external wallet
  const [copiedExternal, setCopiedExternal] = useState(false);
  
  // Linking/Unlinking wallet states
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [isUnlinkingWallet, setIsUnlinkingWallet] = useState(false);
  
  // Track if auto-link has been triggered this session
  const autoLinkTriggeredRef = useRef(false);
  
  // Track if we should show disconnected UI
  const [showDisconnectedUI, setShowDisconnectedUI] = useState(() => {
    return localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true';
  });

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

  // Use token balances for external wallet
  const externalAddress = (address || walletProfile?.external_wallet_address) as `0x${string}` | undefined;
  const { 
    tokens: externalTokens, 
    totalUsdValue: externalTotalValue, 
    isLoading: isExternalLoading, 
    refetch: refetchExternal 
  } = useTokenBalances({ customAddress: externalAddress });

  // Get CAMLY price for claimable calculation
  const camlyPrice = useMemo(() => {
    const camlyToken = externalTokens.find(t => t.symbol === 'CAMLY');
    return camlyToken?.price || 0;
  }, [externalTokens]);

  // On mount, disconnect wagmi if user explicitly disconnected before
  useEffect(() => {
    const wasDisconnected = localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true';
    if (wasDisconnected && showDisconnectedUI && isConnected) {
      disconnect();
    }
  }, [isConnected, disconnect, showDisconnectedUI]);

  // When wallet becomes connected, clear disconnected flag
  useEffect(() => {
    if (isConnected) {
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      setShowDisconnectedUI(false);
    }
  }, [isConnected]);

  // Switch to BNB Chain if wrong network
  useEffect(() => {
    if (isConnected && chainId && chainId !== bsc.id) {
      switchChain(
        { chainId: bsc.id },
        {
          onSuccess: () => toast.success('Đã chuyển sang BNB Smart Chain'),
          onError: () => {
            toast.error('Vui lòng chuyển sang BNB Smart Chain', {
              action: { label: 'Switch Network', onClick: handleSwitchNetwork },
            });
          },
        }
      );
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    fetchProfile();
    fetchWalletProfile();
    fetchClaimableReward();
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchProfile();
      fetchWalletProfile();
      fetchClaimableReward();
    }
  }, [isConnected, address]);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url, full_name, reward_status, admin_notes')
        .eq('id', session.user.id)
        .single();
      if (data) setProfile(data);
    }
  };

  const fetchWalletProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('external_wallet_address, custodial_wallet_address, default_wallet_type')
        .eq('id', session.user.id)
        .single();
      
      if (data) {
        setWalletProfile(data as WalletProfile);
      }
      setWalletProfileFetched(true);
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
          .select('amount')
          .eq('user_id', userId);
          
        const claimed = claims?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        setClaimedAmount(claimed);
        setClaimableReward(Math.max(0, totalReward - claimed));
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
      }
    } catch (error) {
      console.error('[WalletCenter] fetchClaimableReward error:', error);
    } finally {
      setIsRewardLoading(false);
    }
  };

  const handleConnect = useCallback(() => {
    setShowDisconnectedUI(false);
    localStorage.removeItem(WALLET_DISCONNECTED_KEY);
    if (openConnectModal) {
      openConnectModal();
    } else {
      toast.error('Không thể mở modal kết nối ví');
    }
  }, [openConnectModal]);

  const handleSwitchAccount = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        toast.success('Đã chuyển tài khoản thành công!');
        refetchExternal();
      } else {
        toast.error('Wallet không khả dụng');
      }
    } catch (error: any) {
      if (error?.code === 4001) {
        toast.error('Bạn đã hủy chuyển tài khoản');
      } else {
        toast.error('Không thể chuyển tài khoản');
      }
    }
  }, [refetchExternal]);

  const handleDisconnect = useCallback(() => {
    localStorage.setItem(WALLET_DISCONNECTED_KEY, 'true');
    setShowDisconnectedUI(true);
    disconnect();
    toast.success('Đã ngắt kết nối ví');
  }, [disconnect]);

  const handleSwitchNetwork = useCallback(() => {
    switchChain(
      { chainId: bsc.id },
      {
        onSuccess: () => toast.success('Đã chuyển sang BNB Smart Chain'),
        onError: () => toast.error('Không thể chuyển network. Vui lòng thử lại.'),
      }
    );
  }, [switchChain]);

  // Link wallet to profile
  const linkWalletToProfile = useCallback(async () => {
    if (!address || !isConnected) {
      toast.error('Vui lòng kết nối ví trước');
      return;
    }

    setIsLinkingWallet(true);
    
    try {
      const timestamp = Date.now();
      const message = `Xác nhận liên kết ví ${address} với tài khoản F.U. Profile của bạn.\n\nTimestamp: ${timestamp}`;
      
      const signature = await signMessageAsync({ message, account: address });
      
      const { data, error } = await supabase.functions.invoke('connect-external-wallet', {
        body: { wallet_address: address, signature, message }
      });
      
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Không thể liên kết ví');
      }
      
      await fetchWalletProfile();
      toast.success(`Đã liên kết ${getWalletDisplayName()} thành công!`);
      
    } catch (err: any) {
      console.error('[WalletCenter] Link wallet error:', err);
      
      if (err?.message?.includes('rejected') || err?.name === 'UserRejectedRequestError') {
        toast.error('Bạn đã từ chối ký xác nhận');
      } else if (err?.message?.includes('already connected')) {
        toast.error('Ví này đã được liên kết với tài khoản khác');
      } else {
        toast.error(err?.message || 'Không thể liên kết ví');
      }
    } finally {
      setIsLinkingWallet(false);
    }
  }, [address, isConnected, signMessageAsync, getWalletDisplayName]);

  // Auto-link wallet when connected but not yet linked to profile
  useEffect(() => {
    const autoLinkWallet = async () => {
      // Only auto-link if:
      // 1. Wallet is connected (wagmi state)
      // 2. Profile data has been fetched
      // 3. No external_wallet_address in profile yet (not linked)
      // 4. We have an address from wagmi
      // 5. Not currently in linking process
      // 6. Auto-link hasn't been triggered yet this session
      if (
        isConnected &&
        walletProfileFetched &&
        !walletProfile?.external_wallet_address &&
        address &&
        !isLinkingWallet &&
        !autoLinkTriggeredRef.current
      ) {
        console.log('[WalletCenter] Auto-linking wallet:', address);
        autoLinkTriggeredRef.current = true; // Mark as triggered
        // Small delay to ensure UI is ready
        setTimeout(() => {
          linkWalletToProfile();
        }, 500);
      }
    };

    autoLinkWallet();
  }, [isConnected, walletProfileFetched, walletProfile?.external_wallet_address, address, isLinkingWallet, linkWalletToProfile]);

  // Unlink external wallet
  const unlinkWalletFromProfile = useCallback(async () => {
    if (!walletProfile?.external_wallet_address) {
      toast.error('Không có ví external để hủy liên kết');
      return;
    }

    setIsUnlinkingWallet(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('disconnect-external-wallet');
      
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Không thể hủy liên kết');
      }
      
      disconnect();
      await fetchWalletProfile();
      toast.success('Đã hủy liên kết ví External');
      
    } catch (err: any) {
      console.error('[WalletCenter] Unlink wallet error:', err);
      toast.error(err?.message || 'Không thể hủy liên kết ví');
    } finally {
      setIsUnlinkingWallet(false);
    }
  }, [walletProfile, disconnect]);

  // Copy handler
  const copyExternalAddress = useCallback(() => {
    const addr = address || walletProfile?.external_wallet_address;
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopiedExternal(true);
      toast.success('Đã copy địa chỉ ví');
      setTimeout(() => setCopiedExternal(false), 2000);
    }
  }, [address, walletProfile]);

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
    return !!(walletProfile?.external_wallet_address || isConnected);
  }, [walletProfile, isConnected]);

  // Show connect wallet screen if no wallet at all
  if (!hasAnyWallet && !isConnected && showDisconnectedUI) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-600 to-green-500 p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-yellow-400 drop-shadow-lg">My Wallet</h1>
              <div className="flex items-center gap-2 bg-yellow-400/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-yellow-400/30">
                <img src={bnbLogo} alt="BNB" className="w-5 h-5" />
                <span className="text-sm font-medium text-white">BNB Smart Chain</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Wallet Card */}
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <Wallet className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Kết nối ví để tiếp tục</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Kết nối ví của bạn (MetaMask, Bitget, Trust Wallet, FUN Wallet) để xem tài sản và thực hiện giao dịch trên BNB Smart Chain
          </p>
          
          <Button
            onClick={handleConnect}
            className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-yellow-300 font-bold text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-green-500/40 transition-all duration-300 hover:scale-105"
          >
            <Wallet className="w-6 h-6 mr-2" />
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Main wallet UI - single column layout
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-white">
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Wallet</h1>
              <p className="text-sm text-muted-foreground">{profile?.username || 'Account'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1.5 rounded-full border border-yellow-300">
            <img src={bnbLogo} alt="BNB" className="w-5 h-5" />
            <span className="text-sm font-medium text-yellow-700">BNB Smart Chain</span>
          </div>
        </div>
      </div>

      {/* Single Column Layout - External Wallet Only */}
      <div className="w-full">
        <WalletCard
          walletType="external"
          walletAddress={address || walletProfile?.external_wallet_address || null}
          walletName={getWalletDisplayName()}
          connectorType={connectedWalletType}
          isConnected={isConnected}
          isLinkedToProfile={!!walletProfile?.external_wallet_address}
          tokens={externalTokens}
          totalUsdValue={externalTotalValue}
          isTokensLoading={isExternalLoading}
          copied={copiedExternal}
          onCopy={copyExternalAddress}
          onRefresh={refetchExternal}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onLink={linkWalletToProfile}
          onUnlink={unlinkWalletFromProfile}
          onSwitchAccount={handleSwitchAccount}
          onReceive={() => setShowReceive(true)}
          onSend={() => setShowSend(true)}
          onSwap={() => window.open('https://pancakeswap.finance/swap', '_blank')}
          onBuy={() => window.open('https://www.moonpay.com/buy', '_blank')}
          isLinkingWallet={isLinkingWallet || isSigningMessage}
          isUnlinkingWallet={isUnlinkingWallet}
        />
      </div>

      {/* Reward Ready to Claim */}
      {(() => {
        const rewardStatus = profile?.reward_status || 'pending';
        const adminNotes = profile?.admin_notes;
        
        const statusConfig = {
          pending: { bg: 'bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600', label: 'Đang chờ duyệt', labelColor: 'text-gray-900', disabled: true },
          approved: { bg: 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500', label: 'Sẵn sàng Claim', labelColor: 'text-yellow-900', disabled: false },
          on_hold: { bg: 'bg-gradient-to-r from-yellow-600 via-orange-500 to-amber-600', label: 'Đang treo', labelColor: 'text-yellow-100', disabled: true },
          rejected: { bg: 'bg-gradient-to-r from-red-500 via-red-600 to-red-700', label: 'Đã từ chối', labelColor: 'text-white', disabled: true }
        };
        
        const config = statusConfig[rewardStatus as keyof typeof statusConfig] || statusConfig.pending;
        
        return (
          <div className={`${config.bg} rounded-xl p-4 flex items-center justify-between shadow-lg flex-wrap gap-3`}>
            <div className="flex items-center gap-3">
              <Gift className={`w-6 h-6 ${config.labelColor}`} />
              <div className="flex flex-col">
                <span className={`font-semibold ${config.labelColor}`}>
                  Claimable: {formatNumber(claimableReward, 0)} CAMLY (~{formatUsd(claimableReward * camlyPrice)})
                </span>
                <span className={`text-xs ${config.labelColor} opacity-80`}>Trạng thái: {config.label}</span>
              </div>
              {(rewardStatus === 'on_hold' || rewardStatus === 'rejected') && adminNotes && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className={`p-1 rounded-full ${rewardStatus === 'rejected' ? 'bg-white/20' : 'bg-yellow-900/20'}`}>
                        <Info className={`w-4 h-4 ${config.labelColor}`} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm font-medium mb-1">Ghi chú từ Admin:</p>
                      <p className="text-sm">{adminNotes}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Button 
              className={`font-semibold px-6 shadow-md transition-all ${
                config.disabled 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-white text-yellow-700 hover:bg-yellow-50 hover:shadow-lg border-2 border-yellow-600'
              }`}
              onClick={() => {
                if (config.disabled) {
                  if (rewardStatus === 'pending') toast.info('Phần thưởng đang chờ Admin duyệt');
                  else if (rewardStatus === 'on_hold') toast.warning('Phần thưởng đang bị treo. Vui lòng liên hệ Admin.');
                  else if (rewardStatus === 'rejected') toast.error('Phần thưởng đã bị từ chối. Vui lòng liên hệ Admin.');
                } else {
                  setShowClaimDialog(true);
                }
              }}
              disabled={config.disabled}
            >
              {config.disabled ? (
                rewardStatus === 'on_hold' ? <><AlertTriangle className="w-4 h-4 mr-1" /> Đang treo</> :
                rewardStatus === 'rejected' ? 'Đã từ chối' : 'Chờ duyệt'
              ) : 'Claim to Wallet'}
            </Button>
          </div>
        );
      })()}

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

      {/* Receive Dialog */}
      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nhận tiền</DialogTitle>
          </DialogHeader>
          <ReceiveTab 
            walletAddress={address || walletProfile?.external_wallet_address || undefined} 
          />
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gửi tiền</DialogTitle>
          </DialogHeader>
          <SendTab />
        </DialogContent>
      </Dialog>

      {/* Claim Reward Dialog */}
      <ClaimRewardDialog
        open={showClaimDialog}
        onOpenChange={setShowClaimDialog}
        claimableAmount={claimableReward}
        externalWallet={walletProfile?.external_wallet_address || (isConnected ? address : null) || null}
        camlyPrice={camlyPrice}
        onSuccess={() => {
          fetchClaimableReward();
          refetchExternal();
        }}
      />
    </div>
  );
};

export default WalletCenterContainer;
