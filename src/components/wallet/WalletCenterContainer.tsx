import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowDown, ArrowUp, RefreshCw, ShoppingCart, Copy, Check, Gift, ArrowUpRight, ArrowDownLeft, Repeat, Wallet, LogOut, TrendingUp, TrendingDown, UserRoundCog } from 'lucide-react';
import { toast } from 'sonner';
import { ReceiveTab } from './ReceiveTab';
import { SendTab } from './SendTab';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import camlyCoinLogo from '@/assets/camly-coin-logo.png';
import metamaskLogo from '@/assets/metamask-logo.png';

interface Profile {
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: string;
  token_symbol: string;
  created_at: string;
}

// Key to track if user explicitly disconnected
const WALLET_DISCONNECTED_KEY = 'fun_profile_wallet_disconnected';

const WalletCenterContainer = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
  // Use real token balances hook
  const { tokens, totalUsdValue, isLoading: isTokensLoading, refetch: refetchTokens, prices } = useTokenBalances();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimableReward, setClaimableReward] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Track if user explicitly disconnected - this prevents auto-reconnect
  const [userDisconnected, setUserDisconnected] = useState(() => {
    return localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true';
  });

  // When wallet connects successfully, clear the disconnected flag
  useEffect(() => {
    if (isConnected && userDisconnected) {
      // Small delay to ensure wagmi has fully connected
      const timer = setTimeout(() => {
        setUserDisconnected(false);
        localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isConnected, userDisconnected]);

  // Check and switch to BNB Chain if wrong network
  useEffect(() => {
    if (isConnected && chainId && chainId !== bsc.id) {
      switchChain(
        { chainId: bsc.id },
        {
          onSuccess: () => toast.success('Đã chuyển sang BNB Smart Chain'),
          onError: () => {
            toast.error('Vui lòng chuyển sang BNB Smart Chain', {
              action: {
                label: 'Switch Network',
                onClick: () => handleSwitchNetwork(),
              },
            });
          },
        }
      );
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    fetchProfile();
    fetchClaimableReward();
    fetchTransactions();
  }, []);

  // Refetch tokens when connected
  useEffect(() => {
    if (isConnected) {
      refetchTokens();
    }
  }, [isConnected, refetchTokens]);

  // Refetch data when wallet connects
  useEffect(() => {
    if (isConnected) {
      fetchProfile();
      fetchClaimableReward();
      fetchTransactions();
    }
  }, [isConnected, address]);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url, full_name')
        .eq('id', session.user.id)
        .single();
      if (data) setProfile(data);
    }
  };

  const fetchClaimableReward = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const userId = session.user.id;
    
    const [postsRes, commentsRes, reactionsRes, friendsRes, sharesRes] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('comments').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('reactions').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('friendships').select('id', { count: 'exact' }).eq('friend_id', userId).eq('status', 'accepted'),
      supabase.from('shared_posts').select('original_post_id').eq('user_id', userId),
    ]);

    const postCount = postsRes.count || 0;
    const commentCount = commentsRes.count || 0;
    const reactionCount = reactionsRes.count || 0;
    const friendCount = friendsRes.count || 0;
    const shareCount = sharesRes.data?.length || 0;

    const totalReward = (postCount * 10000) + (commentCount * 5000) + (reactionCount * 1000) + (friendCount * 50000) + (shareCount * 20000) + 50000;

    const { data: claims } = await supabase
      .from('reward_claims')
      .select('amount')
      .eq('user_id', userId);

    const claimedAmount = claims?.reduce((sum, c) => sum + c.amount, 0) || 0;
    setClaimableReward(totalReward - claimedAmount);
  };

  const fetchTransactions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setTransactions(data.map(tx => ({
        id: tx.id,
        type: tx.from_address.toLowerCase() === address?.toLowerCase() ? 'sent' : 'received',
        description: tx.from_address.toLowerCase() === address?.toLowerCase() 
          ? `Sent ${tx.amount} ${tx.token_symbol} to ${tx.to_address.slice(0, 6)}...${tx.to_address.slice(-4)}`
          : `Received ${tx.amount} ${tx.token_symbol}`,
        amount: tx.amount,
        token_symbol: tx.token_symbol,
        created_at: tx.created_at,
      })));
    }
  };

  const handleConnect = useCallback(async () => {
    // Clear previous state
    setConnectionError(null);
    setUserDisconnected(false);
    setIsConnecting(true);
    localStorage.removeItem(WALLET_DISCONNECTED_KEY);

    // Check if MetaMask is installed
    if (typeof window === 'undefined' || !window.ethereum) {
      setIsConnecting(false);
      toast.error('Vui lòng cài đặt MetaMask để tiếp tục');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      // CRITICAL: Call eth_requestAccounts directly to trigger MetaMask popup
      // This is necessary because wagmi's connect() doesn't always trigger popup in iframe
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Find MetaMask connector
      const metamaskConnector = connectors.find(c => c.name === 'MetaMask') || connectors.find(c => c.id === 'injected');
      
      if (metamaskConnector) {
        // Now sync wagmi state
        connect(
          { connector: metamaskConnector, chainId: bsc.id },
          {
            onSuccess: () => {
              setIsConnecting(false);
              setConnectionError(null);
              toast.success('Kết nối ví thành công!');
            },
            onError: () => {
              // Even if wagmi connect fails, we're connected via eth_requestAccounts
              // Just refresh the page to sync state
              setIsConnecting(false);
              window.location.reload();
            },
          }
        );
      } else {
        setIsConnecting(false);
        toast.success('Kết nối ví thành công!');
        // Reload to ensure wagmi picks up the connection
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error: any) {
      setIsConnecting(false);
      const errorMsg = error?.message || '';
      const errorCode = error?.code;
      
      if (errorCode === 4001 || errorMsg.includes('User rejected') || errorMsg.includes('rejected')) {
        setConnectionError('Bạn đã từ chối kết nối ví');
        toast.error('Bạn đã từ chối kết nối ví');
      } else if (errorCode === -32002 || errorMsg.includes('already pending')) {
        setConnectionError('Đang có yêu cầu kết nối. Vui lòng mở MetaMask và xác nhận.');
        toast.info('Vui lòng mở MetaMask và xác nhận kết nối', { duration: 5000 });
      } else {
        setConnectionError('Không thể kết nối ví. Vui lòng thử lại.');
        toast.error('Không thể kết nối ví');
        console.error('Connect error:', error);
      }
    }
  }, [connectors, connect]);

  // Switch account - requests MetaMask to show account picker
  const handleSwitchAccount = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Request MetaMask to open account picker
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        toast.success('Đã chuyển tài khoản thành công!');
        // Refetch data after account switch
        refetchTokens();
        fetchTransactions();
      } else {
        toast.error('MetaMask không khả dụng');
      }
    } catch (error: any) {
      if (error?.code === 4001) {
        toast.error('Bạn đã hủy chuyển tài khoản');
      } else {
        toast.error('Không thể chuyển tài khoản');
      }
    }
  }, [refetchTokens]);

  const handleDisconnect = () => {
    // Set disconnected flag immediately for instant UI update
    setUserDisconnected(true);
    localStorage.setItem(WALLET_DISCONNECTED_KEY, 'true');
    // Clear all wallet data
    setTransactions([]);
    setClaimableReward(0);
    // Disconnect from wagmi
    disconnect();
    toast.success('Đã ngắt kết nối ví');
  };

  const handleSwitchNetwork = () => {
    switchChain(
      { chainId: bsc.id },
      {
        onSuccess: () => toast.success('Đã chuyển sang BNB Smart Chain'),
        onError: () => toast.error('Không thể chuyển network. Vui lòng thử lại.'),
      }
    );
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Đã copy địa chỉ ví');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x0000...0000';

  // Format number with dot as thousands separator, comma for decimal (Vietnamese/European style like MetaMask)
  const formatNumber = (num: number, decimals: number = 0) => {
    const fixed = num.toFixed(decimals);
    const [integerPart, decimalPart] = fixed.split('.');
    // Add thousand separators (dots)
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (decimals > 0 && decimalPart) {
      return `${formattedInteger},${decimalPart}`;
    }
    return formattedInteger;
  };

  // Format USD value (always 2 decimals)
  const formatUsd = (num: number) => {
    return `$${formatNumber(num, 2)}`;
  };

  // Format token balance (remove trailing zeros, max 6 decimals)
  const formatTokenBalance = (num: number, symbol: string) => {
    // For very small numbers, show more decimals
    if (num > 0 && num < 0.000001) {
      return formatNumber(num, 8);
    }
    if (num > 0 && num < 0.01) {
      return formatNumber(num, 6);
    }
    // For whole numbers, no decimals
    if (Number.isInteger(num) || Math.abs(num - Math.round(num)) < 0.0001) {
      return formatNumber(Math.round(num), 0);
    }
    // For regular numbers, up to 4 decimals
    return formatNumber(num, 4);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sent': return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'received': return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'claimed': return <Gift className="w-5 h-5 text-yellow-500" />;
      case 'swapped': return <Repeat className="w-5 h-5 text-purple-500" />;
      default: return <ArrowUpRight className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  // Not connected state - Show Connect Wallet button
  // Show Connect Wallet UI when not connected OR user explicitly disconnected
  if (!isConnected || userDisconnected) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-600 to-green-500 p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-yellow-400 drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                My Wallet
              </h1>
              <div className="flex items-center gap-2 bg-yellow-400/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-yellow-400/30">
                <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png" alt="BNB" className="w-5 h-5" />
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
            Vui lòng kết nối MetaMask để xem tài sản và thực hiện giao dịch trên BNB Smart Chain
          </p>
          
          {/* Error message */}
          {connectionError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{connectionError}</p>
            </div>
          )}
          
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-yellow-300 font-bold text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-green-500/40 transition-all duration-300 hover:scale-105 disabled:opacity-70"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-6 h-6 mr-2 animate-spin" />
                Đang kết nối...
              </>
            ) : (
              <>
                <img 
                  src={metamaskLogo} 
                  alt="MetaMask" 
                  className="w-6 h-6 mr-2"
                />
                Connect Wallet
              </>
            )}
          </Button>

          {/* Connecting status message */}
          {isConnecting && (
            <p className="text-sm text-muted-foreground mt-4 animate-pulse">
              MetaMask popup sẽ hiện lên, vui lòng xác nhận kết nối...
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-6">
            Chưa có MetaMask?{' '}
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Tải xuống tại đây
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b">
          <h1 className="text-xl font-bold text-gray-900">My Wallet</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1.5 rounded-full border border-yellow-300">
              <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png" alt="BNB" className="w-5 h-5" />
              <span className="text-sm font-medium text-yellow-700">BNB Smart Chain</span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-white text-xs">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block">{profile?.username || 'Account'}</span>
              <button 
                onClick={copyAddress}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <span>{shortenedAddress}</span>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {/* Switch Account Button */}
            <Button
              onClick={handleSwitchAccount}
              variant="ghost"
              size="sm"
              className="bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all duration-200"
            >
              <UserRoundCog className="w-4 h-4 mr-1" />
              Switch
            </Button>
            {/* Disconnect Button */}
            <Button
              onClick={handleDisconnect}
              variant="ghost"
              size="sm"
              className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-600 to-green-400 p-6">
          <p className="text-white/80 text-sm mb-1">Total Assets</p>
          {isTokensLoading ? (
            <div className="animate-pulse bg-white/20 rounded h-12 w-64 mb-6" />
          ) : (
            <p className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.2)' }}>
              {formatUsd(totalUsdValue)}
            </p>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-center gap-6">
            <button 
              onClick={() => setShowReceive(true)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-yellow-400/50 group-hover:scale-110 transition-all">
                <ArrowDown className="w-6 h-6 text-yellow-900" />
              </div>
              <span className="text-white text-sm font-medium">Receive</span>
            </button>
            <button 
              onClick={() => setShowSend(true)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-yellow-400/50 group-hover:scale-110 transition-all">
                <ArrowUp className="w-6 h-6 text-yellow-900" />
              </div>
              <span className="text-white text-sm font-medium">Send</span>
            </button>
            <button 
              onClick={() => window.open('https://pancakeswap.finance/swap', '_blank')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-yellow-400/50 group-hover:scale-110 transition-all">
                <RefreshCw className="w-6 h-6 text-yellow-900" />
              </div>
              <span className="text-white text-sm font-medium">Swap</span>
            </button>
            <button 
              onClick={() => window.open('https://www.moonpay.com/buy', '_blank')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-yellow-400/50 group-hover:scale-110 transition-all">
                <ShoppingCart className="w-6 h-6 text-yellow-900" />
              </div>
              <span className="text-white text-sm font-medium">Buy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reward Ready to Claim */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Gift className="w-6 h-6 text-yellow-900" />
          <span className="font-semibold text-yellow-900">
            Reward Ready to Claim: {formatNumber(claimableReward, 0)} CAMLY (~{formatUsd(claimableReward * 0.000003)})
          </span>
        </div>
        <Button 
          className="bg-white text-yellow-700 hover:bg-yellow-50 font-semibold px-6 shadow-md hover:shadow-lg transition-all border-2 border-yellow-600"
          onClick={() => toast.info('Tính năng claim reward đang phát triển')}
        >
          Claim to Wallet
        </Button>
      </div>

      {/* Tokens / NFTs Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Tabs defaultValue="tokens" className="w-full">
          <TabsList className="w-full bg-gray-50 p-0 h-auto rounded-none border-b">
            <TabsTrigger 
              value="tokens" 
              className="flex-1 py-3 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-semibold"
            >
              Tokens
            </TabsTrigger>
            <TabsTrigger 
              value="nfts" 
              className="flex-1 py-3 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-semibold"
            >
              NFTs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tokens" className="m-0">
            {/* Refresh button */}
            <div className="flex justify-end p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={refetchTokens}
                disabled={isTokensLoading}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isTokensLoading ? 'animate-spin' : ''}`} />
                {isTokensLoading ? 'Đang tải...' : 'Làm mới'}
              </Button>
            </div>
            <div className="divide-y">
              {tokens.map((token) => (
                <div key={token.symbol} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  {/* Left: Token icon + name + 24h change */}
                  <div className="flex items-center gap-3">
                    <img 
                      src={token.symbol === 'CAMLY' ? camlyCoinLogo : token.icon} 
                      alt={token.symbol} 
                      className="w-10 h-10 rounded-full" 
                    />
                    <div>
                      <p className="font-semibold">{token.name}</p>
                      <div className={`flex items-center text-xs ${token.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: USD value (bold, larger) + token balance (smaller, gray) */}
                  <div className="text-right">
                    {token.isLoading ? (
                      <>
                        <span className="animate-pulse bg-gray-200 rounded w-16 h-5 inline-block mb-1" />
                        <span className="animate-pulse bg-gray-200 rounded w-20 h-4 inline-block" />
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-base">
                          {formatUsd(token.usdValue)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatTokenBalance(token.balance, token.symbol)} {token.symbol}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="nfts" className="m-0 p-8 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium mb-2">Chưa có NFT nào</p>
              <p className="text-sm">Các NFT bạn sở hữu sẽ hiển thị ở đây</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  {getTransactionIcon(tx.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(tx.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Chưa có giao dịch nào</p>
          </div>
        )}
      </div>

      {/* Receive Dialog */}
      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nhận tiền</DialogTitle>
          </DialogHeader>
          <ReceiveTab />
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
    </div>
  );
};

export default WalletCenterContainer;
