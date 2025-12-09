import { useState, useEffect } from 'react';
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowDown, ArrowUp, RefreshCw, ShoppingCart, Copy, Check, Gift, ArrowUpRight, ArrowDownLeft, Repeat, Wallet, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { ReceiveTab } from './ReceiveTab';
import { SendTab } from './SendTab';
import camlyCoinLogo from '@/assets/camly-coin-logo.png';
import metamaskLogo from '@/assets/metamask-logo.png';

interface Profile {
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

interface TokenData {
  symbol: string;
  name: string;
  icon: string;
  price: number;
  balance: number;
  usdValue: number;
  change24h: number;
}

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: string;
  token_symbol: string;
  created_at: string;
}

const WALLET_CONNECTED_KEY = 'fun_profile_wallet_connected';

const WalletCenterContainer = () => {
  const { address, isConnected, chainId } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimableReward, setClaimableReward] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(() => {
    return localStorage.getItem(WALLET_CONNECTED_KEY) !== 'true';
  });
  const [tokens, setTokens] = useState<TokenData[]>([
    { symbol: 'BNB', name: 'BNB', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', price: 320.50, balance: 0, usdValue: 0, change24h: 2.5 },
    { symbol: 'USDT', name: 'Tether USD', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png', price: 1.00, balance: 0, usdValue: 0, change24h: 0.01 },
    { symbol: 'BTCB', name: 'Bitcoin BEP20', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', price: 42000.00, balance: 0, usdValue: 0, change24h: 1.8 },
    { symbol: 'CAMLY', name: 'Camly Coin', icon: camlyCoinLogo, price: 0.066, balance: 0, usdValue: 0, change24h: 5.2 },
  ]);

  // Save wallet connection state to localStorage and reset manuallyDisconnected when connected
  useEffect(() => {
    if (isConnected && !manuallyDisconnected) {
      localStorage.setItem(WALLET_CONNECTED_KEY, 'true');
    }
    // Reset manuallyDisconnected when wallet connects successfully
    if (isConnected) {
      setManuallyDisconnected(false);
    }
  }, [isConnected]);

  // Check and switch to BNB Chain if wrong network
  useEffect(() => {
    if (isConnected && chainId && chainId !== bsc.id) {
      toast.error('Vui lòng chuyển sang BNB Smart Chain', {
        action: {
          label: 'Switch Network',
          onClick: () => handleSwitchNetwork(),
        },
      });
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    fetchProfile();
    fetchClaimableReward();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (balanceData) {
      setTokens(prev => prev.map(token => {
        if (token.symbol === 'BNB') {
          const balance = parseFloat(balanceData.formatted);
          return { ...token, balance, usdValue: balance * token.price };
        }
        return token;
      }));
    }
  }, [balanceData]);

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

  const handleConnect = async () => {
    const metamaskConnector = connectors.find(c => c.name === 'MetaMask');
    if (metamaskConnector) {
      try {
        connect(
          { connector: metamaskConnector, chainId: bsc.id },
          {
            onSuccess: () => {
              toast.success('Kết nối ví thành công!');
              localStorage.setItem(WALLET_CONNECTED_KEY, 'true');
            },
            onError: (error) => {
              if (error.message.includes('User rejected')) {
                toast.error('Bạn đã từ chối kết nối ví');
              } else {
                toast.error('Không thể kết nối ví. Vui lòng thử lại.');
              }
            },
          }
        );
      } catch (error) {
        toast.error('Không thể kết nối ví');
      }
    } else {
      toast.error('Vui lòng cài đặt MetaMask để tiếp tục');
      window.open('https://metamask.io/download/', '_blank');
    }
  };

  const handleDisconnect = () => {
    // Set local state immediately for instant UI update
    setManuallyDisconnected(true);
    // Clear localStorage
    localStorage.removeItem(WALLET_CONNECTED_KEY);
    // Clear all wallet data
    setTokens(prev => prev.map(token => ({ ...token, balance: 0, usdValue: 0 })));
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

  const totalUsdValue = tokens.reduce((sum, token) => sum + token.usdValue, 0);
  const shortenedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x0000...0000';

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.floor(num));
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
  // Show Connect Wallet UI when not connected OR manually disconnected
  if (!isConnected || manuallyDisconnected) {
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
          
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-yellow-300 font-bold text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-green-500/40 transition-all duration-300 hover:scale-105"
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
          <p className="text-white/80 text-sm mb-1">Total Assets on BNB Chain:</p>
          <p className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.2)' }}>
            ~${formatNumber(totalUsdValue)}.00 USD
          </p>
          
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
            Reward Ready to Claim: {formatNumber(claimableReward)} CAMLY (~${formatNumber(claimableReward * 0.066)})
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
            <div className="divide-y">
              {tokens.map((token) => (
                <div key={token.symbol} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={token.icon} alt={token.symbol} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-semibold">{token.symbol}</p>
                      <p className="text-xs text-muted-foreground">{token.name}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">{token.balance.toFixed(token.symbol === 'BTCB' ? 4 : 2)} {token.symbol}</p>
                    <p className="text-sm text-muted-foreground">(~${formatNumber(token.usdValue)} USD)</p>
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
