import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TokenSelector, SUPPORTED_TOKENS, TokenOption } from './TokenSelector';
import { QuickGiftPicker, MESSAGE_TEMPLATES, MessageTemplate } from './QuickGiftPicker';
import { DonationSuccessCard, DonationCardData } from './DonationSuccessCard';
import { useSendToken, TxStep } from '@/hooks/useSendToken';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { validateMinSendValue } from '@/lib/minSendValidation';
import { validateEvmAddress } from '@/utils/walletValidation';
import { useDebounce } from '@/hooks/useDebounce';
import { useAccount, useBalance, useReadContract, useChainId, useSwitchChain } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Loader2, Wallet, Gift, AlertCircle, Send, Copy, AlertTriangle, ExternalLink, CheckCircle2, RefreshCw, Search, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { EmojiPicker } from '@/components/feed/EmojiPicker';
import { bsc } from 'wagmi/chains';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';

// ERC20 ABI for balanceOf
const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const STEP_CONFIG: Record<string, { label: string; progress: number }> = {
  idle: { label: '', progress: 0 },
  signing: { label: 'Vui lòng xác nhận trong ví...', progress: 15 },
  broadcasted: { label: 'Giao dịch đã được gửi lên mạng', progress: 35 },
  confirming: { label: 'Đang chờ xác nhận từ blockchain...', progress: 60 },
  finalizing: { label: 'Đang ghi nhận vào hệ thống...', progress: 85 },
  success: { label: 'Hoàn tất!', progress: 100 },
  timeout: { label: 'Chưa nhận được xác nhận kịp thời', progress: 70 },
};

interface ResolvedRecipient {
  id: string;
  username: string;
  avatarUrl: string | null;
  walletAddress: string | null;
}

export interface UnifiedGiftSendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'wallet' | 'post' | 'navbar';
  presetRecipient?: {
    id?: string;
    username?: string;
    avatarUrl?: string | null;
    walletAddress?: string | null;
  };
  postId?: string;
  onSuccess?: () => void;
}

export const UnifiedGiftSendDialog = ({
  isOpen,
  onClose,
  mode,
  presetRecipient,
  postId,
  onSuccess,
}: UnifiedGiftSendDialogProps) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { tokens: tokenBalanceList } = useTokenBalances();
  const { sendToken, isPending, txStep, txHash, recheckReceipt, resetState } = useSendToken();

  const [selectedToken, setSelectedToken] = useState<TokenOption>(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successCardData, setSuccessCardData] = useState<DonationCardData | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isRecordingDonation, setIsRecordingDonation] = useState(false);

  // Recipient search state
  const [searchTab, setSearchTab] = useState<'username' | 'address'>('username');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ResolvedRecipient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [resolvedRecipient, setResolvedRecipient] = useState<ResolvedRecipient | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Determine effective recipient
  const effectiveRecipient = useMemo(() => {
    if (presetRecipient?.id && presetRecipient?.username) {
      return {
        id: presetRecipient.id,
        username: presetRecipient.username,
        avatarUrl: presetRecipient.avatarUrl ?? null,
        walletAddress: presetRecipient.walletAddress ?? null,
      } as ResolvedRecipient;
    }
    return resolvedRecipient;
  }, [presetRecipient, resolvedRecipient]);

  const effectiveRecipientAddress = effectiveRecipient?.walletAddress || '';
  const hasRecipient = !!effectiveRecipient;
  const isFormDisabled = !hasRecipient;

  // Get native BNB balance
  const { data: bnbBalance } = useBalance({
    address,
    chainId: bsc.id,
  });

  // Get ERC20 token balance
  const { data: tokenBalance } = useReadContract({
    address: selectedToken.address as `0x${string}` | undefined,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: bsc.id,
  });

  const formattedBalance = useMemo(() => {
    if (selectedToken.symbol === 'BNB') {
      return bnbBalance ? parseFloat(bnbBalance.formatted) : 0;
    }
    if (tokenBalance) {
      return parseFloat(formatUnits(tokenBalance as bigint, selectedToken.decimals));
    }
    return 0;
  }, [selectedToken, bnbBalance, tokenBalance]);

  const bnbBalanceNum = useMemo(() => {
    return bnbBalance ? parseFloat(bnbBalance.formatted) : 0;
  }, [bnbBalance]);

  // Get USD price for the selected token
  const selectedTokenPrice = useMemo(() => {
    const found = tokenBalanceList.find(t => t.symbol === selectedToken.symbol);
    return found?.price ?? null;
  }, [tokenBalanceList, selectedToken]);

  const parsedAmountNum = parseFloat(amount) || 0;
  const minSendCheck = parsedAmountNum > 0
    ? validateMinSendValue(parsedAmountNum, selectedTokenPrice)
    : { valid: false } as { valid: boolean; message?: string };
  const estimatedUsd = parsedAmountNum * (selectedTokenPrice || 0);
  const isValidAmount = minSendCheck.valid;
  const hasEnoughBalance = formattedBalance >= parsedAmountNum;
  const isWrongNetwork = chainId !== bsc.id;
  const needsGasWarning = selectedToken.symbol !== 'BNB' && bnbBalanceNum < 0.002 && parsedAmountNum > 0;
  const isLargeAmount = parsedAmountNum > formattedBalance * 0.8 && parsedAmountNum > 0;

  const isInProgress = ['signing', 'broadcasted', 'confirming', 'finalizing'].includes(txStep);
  const stepInfo = STEP_CONFIG[txStep] || STEP_CONFIG.idle;

  // Search for recipient by username or address
  const performSearch = useCallback(async (query: string, tab: 'username' | 'address') => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      if (tab === 'username') {
        const cleanQuery = query.replace(/^@/, '');
        if (cleanQuery.length < 2) {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, wallet_address')
          .ilike('username', `%${cleanQuery}%`)
          .limit(5);

        if (error) throw error;

        if (data && data.length > 0) {
          setSearchResults(data.map(p => ({
            id: p.id,
            username: p.username,
            avatarUrl: p.avatar_url,
            walletAddress: p.wallet_address,
          })));
        } else {
          setSearchResults([]);
          setSearchError('Không tìm thấy người dùng');
        }
      } else {
        // address tab
        const addr = query.trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
          setSearchResults([]);
          if (addr.length > 3) setSearchError('Địa chỉ ví không hợp lệ');
          setIsSearching(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, wallet_address')
          .ilike('wallet_address', addr)
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setSearchResults(data.map(p => ({
            id: p.id,
            username: p.username,
            avatarUrl: p.avatar_url,
            walletAddress: p.wallet_address,
          })));
        } else {
          setSearchResults([]);
          setSearchError('Không tìm thấy FUN username cho địa chỉ này');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Lỗi khi tìm kiếm');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Trigger search on debounced query change
  useEffect(() => {
    if (!isOpen || (mode === 'post' && presetRecipient?.id)) return;
    performSearch(debouncedSearchQuery, searchTab);
  }, [debouncedSearchQuery, searchTab, isOpen, mode, presetRecipient, performSearch]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setSelectedTemplate(null);
      setCustomMessage('');
      setSelectedToken(SUPPORTED_TOKENS[0]);
      setShowSuccessCard(false);
      setSuccessCardData(null);
      setSearchTab('username');
      setSearchQuery('');
      setSearchResults([]);
      setSearchError('');
      setResolvedRecipient(null);
      resetState();
    }
  }, [isOpen]);

  const handleSelectRecipient = (recipient: ResolvedRecipient) => {
    setResolvedRecipient(recipient);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleClearRecipient = () => {
    setResolvedRecipient(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
  };

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    if (template.id !== 'custom') {
      setCustomMessage(template.message);
    } else {
      setCustomMessage('');
    }
  };

  const handleSelectQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleMaxAmount = () => {
    if (formattedBalance > 0) {
      if (selectedToken.symbol === 'BNB') {
        const maxBnb = Math.max(0, formattedBalance - 0.002);
        setAmount(maxBnb.toString());
      } else {
        setAmount(formattedBalance.toString());
      }
    }
  };

  const handleCopyAddress = () => {
    if (effectiveRecipientAddress) {
      navigator.clipboard.writeText(effectiveRecipientAddress);
      toast.success('Đã copy địa chỉ ví');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setCustomMessage(prev => prev + emoji);
  };

  const handleSend = async () => {
    if (!effectiveRecipientAddress) {
      toast.error('Người nhận chưa có ví liên kết');
      return;
    }

    // Map TokenOption to WalletToken for useSendToken
    const walletToken = {
      symbol: selectedToken.symbol,
      name: selectedToken.name,
      address: selectedToken.address as `0x${string}` | null,
      decimals: selectedToken.decimals,
      logo: selectedToken.logo,
      color: selectedToken.color,
    };

    const hash = await sendToken({
      token: walletToken,
      recipient: effectiveRecipientAddress,
      amount,
    });

    if (hash) {
      // Record donation if we have a recipientId
      if (effectiveRecipient?.id) {
        await recordDonation(hash);
      }
      onSuccess?.();
    }
  };

  const recordDonation = async (hash: string) => {
    setIsRecordingDonation(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', session.user.id)
        .single();

      const { data: donationData, error } = await supabase.functions.invoke('record-donation', {
        body: {
          sender_id: session.user.id,
          recipient_id: effectiveRecipient!.id,
          amount,
          token_symbol: selectedToken.symbol,
          token_address: selectedToken.address,
          chain_id: chainId || 56,
          tx_hash: hash,
          message: customMessage,
          message_template: selectedTemplate?.id,
          post_id: postId,
        },
      });

      if (error) {
        console.error('Error recording donation:', error);
        toast.warning('Giao dịch thành công nhưng chưa ghi nhận được. TX: ' + hash.slice(0, 18) + '...', { duration: 10000 });
      }

      const cardData: DonationCardData = {
        id: donationData?.donation?.id || crypto.randomUUID(),
        amount,
        tokenSymbol: selectedToken.symbol,
        senderUsername: senderProfile?.username || 'Unknown',
        senderAvatarUrl: senderProfile?.avatar_url,
        recipientUsername: effectiveRecipient!.username || 'Unknown',
        recipientAvatarUrl: effectiveRecipient!.avatarUrl,
        message: customMessage,
        txHash: hash,
        lightScoreEarned: donationData?.light_score_earned || Math.floor(parseFloat(amount) / 100),
        createdAt: new Date().toISOString(),
      };

      setSuccessCardData(cardData);
      setShowSuccessCard(true);
    } catch (err) {
      console.error('recordDonation error:', err);
    } finally {
      setIsRecordingDonation(false);
    }
  };

  const handleSendReminder = async () => {
    if (!effectiveRecipient?.id) return;
    setIsSendingReminder(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Bạn cần đăng nhập để gửi hướng dẫn');
        return;
      }
      const { error } = await supabase.functions.invoke('notify-gift-ready', {
        body: { recipientId: effectiveRecipient.id, notificationType: 'no_wallet' },
      });
      if (error) throw error;
      toast.success(`Đã gửi hướng dẫn nhận quà cho @${effectiveRecipient.username}!`);
      onClose();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Không thể gửi hướng dẫn. Vui lòng thử lại.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleCloseSuccessCard = () => {
    setShowSuccessCard(false);
    setSuccessCardData(null);
    onClose();
  };

  const handleDialogClose = () => {
    if (!isInProgress && !isRecordingDonation) {
      onClose();
    }
  };

  // Title
  const dialogTitle = effectiveRecipient?.username
    ? `Trao gửi yêu thương cho @${effectiveRecipient.username} 🎁❤️🎉`
    : 'Trao gửi yêu thương 🎁❤️🎉';

  // No wallet warning
  const recipientHasNoWallet = hasRecipient && !effectiveRecipientAddress;

  // Determine if send button should be disabled
  const isSendDisabled =
    !isConnected ||
    !effectiveRecipientAddress ||
    !isValidAmount ||
    !hasEnoughBalance ||
    isPending ||
    isInProgress ||
    isRecordingDonation ||
    isWrongNetwork;

  const scanUrl = txHash ? getBscScanTxUrl(txHash, selectedToken.symbol) : null;

  const isPresetMode = mode === 'post' || (mode === 'navbar' && !!presetRecipient?.id);

  return (
    <>
      <Dialog open={isOpen && !showSuccessCard} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="w-[95vw] max-w-md lg:max-w-[720px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Gift className="w-5 h-5 text-gold shrink-0" />
              <span className="break-words">{dialogTitle}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ====== RECIPIENT SECTION ====== */}
            {isPresetMode ? (
              /* Post/Navbar with preset: fixed recipient card */
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Người nhận:</label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Avatar className="w-10 h-10 border-2 border-gold/30">
                    <AvatarImage src={effectiveRecipient?.avatarUrl || ''} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {effectiveRecipient?.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">@{effectiveRecipient?.username}</p>
                    {effectiveRecipientAddress && (
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {effectiveRecipientAddress.slice(0, 8)}...{effectiveRecipientAddress.slice(-6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Wallet/Navbar without preset: search tabs */
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Người nhận:</label>

                {resolvedRecipient ? (
                  /* Selected recipient card */
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                    <Avatar className="w-10 h-10 border-2 border-gold/30">
                      <AvatarImage src={resolvedRecipient.avatarUrl || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {resolvedRecipient.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">@{resolvedRecipient.username}</p>
                      {resolvedRecipient.walletAddress && (
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {resolvedRecipient.walletAddress.slice(0, 8)}...{resolvedRecipient.walletAddress.slice(-6)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleClearRecipient}
                      className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  /* Search UI */
                  <div className="space-y-2">
                    <Tabs value={searchTab} onValueChange={(v) => {
                      setSearchTab(v as 'username' | 'address');
                      setSearchQuery('');
                      setSearchResults([]);
                      setSearchError('');
                    }}>
                      <TabsList className="w-full">
                        <TabsTrigger value="username" className="flex-1 text-xs gap-1">
                          <User className="w-3.5 h-3.5" />Tìm theo username
                        </TabsTrigger>
                        <TabsTrigger value="address" className="flex-1 text-xs gap-1">
                          <Wallet className="w-3.5 h-3.5" />Tìm theo địa chỉ ví
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchTab === 'username' ? '@username...' : '0x...'}
                        className={`pl-9 text-sm ${searchTab === 'address' ? 'font-mono' : ''}`}
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleSelectRecipient(result)}
                            className="w-full flex items-center gap-3 p-2.5 hover:bg-accent transition-colors text-left"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={result.avatarUrl || ''} />
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {result.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">@{result.username}</p>
                              {result.walletAddress && (
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                  {result.walletAddress.slice(0, 8)}...{result.walletAddress.slice(-6)}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Search error */}
                    {searchError && !isSearching && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                        <p className="text-xs text-destructive">{searchError}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recipient has no wallet */}
            {recipientHasNoWallet && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Người nhận chưa thiết lập ví</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Người này cần kết nối ví Web3 trước khi có thể nhận quà.
                  </p>
                </div>
                <Button
                  onClick={handleSendReminder}
                  disabled={isSendingReminder}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {isSendingReminder ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang gửi...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Hướng Dẫn Nhận Quà</>
                  )}
                </Button>
              </div>
            )}

            {/* Hint when no recipient selected */}
            {isFormDisabled && !recipientHasNoWallet && !isPresetMode && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">Vui lòng chọn người nhận trước</p>
              </div>
            )}

            {/* Wrong network warning */}
            {isWrongNetwork && isConnected && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1">Vui lòng chuyển sang BNB Smart Chain</p>
                <Button size="sm" variant="outline" onClick={() => switchChain({ chainId: bsc.id })}>
                  Switch
                </Button>
              </div>
            )}

            {/* Connect wallet prompt */}
            {!isConnected && !recipientHasNoWallet && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Wallet className="w-5 h-5" />
                    <span className="font-medium">Kết nối ví để gửi</span>
                  </div>
                  <Button onClick={() => openConnectModal?.()} size="sm" className="bg-amber-500 hover:bg-amber-600">
                    Kết nối
                  </Button>
                </div>
              </div>
            )}

            {!recipientHasNoWallet && (
              <div className={isFormDisabled && !isPresetMode ? 'opacity-50 pointer-events-none' : ''}>
                {/* Token Selection */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Chọn token:
                  </label>
                  <TokenSelector selectedToken={selectedToken} onSelect={setSelectedToken} />
                </div>

                {/* Amount Input */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Số lượng:
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="text-lg font-semibold pr-24"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{selectedToken.symbol}</span>
                      {formattedBalance > 0 && (
                        <button type="button" onClick={handleMaxAmount} className="text-xs text-primary hover:underline font-medium">
                          MAX
                        </button>
                      )}
                    </div>
                  </div>
                  {isConnected && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Số dư: {formattedBalance.toLocaleString(undefined, { maximumFractionDigits: selectedToken.decimals })} {selectedToken.symbol}
                    </p>
                  )}
                  {estimatedUsd > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">≈ ${estimatedUsd.toFixed(4)} USD</p>
                  )}
                  {parsedAmountNum > 0 && !minSendCheck.valid && minSendCheck.message && (
                    <p className="text-xs text-destructive mt-1">{minSendCheck.message}</p>
                  )}
                </div>

                {/* Quick Picks */}
                <div className="mb-5">
                  <QuickGiftPicker
                    selectedTemplate={selectedTemplate}
                    onSelectTemplate={handleSelectTemplate}
                    onSelectAmount={handleSelectQuickAmount}
                    currentAmount={amount}
                    tokenSymbol={selectedToken.symbol}
                  />
                </div>

                {/* Custom Message with Emoji Picker */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Lời nhắn:
                  </label>
                  <div className="relative">
                    <Textarea
                      value={customMessage}
                      onChange={(e) => {
                        setCustomMessage(e.target.value);
                        if (selectedTemplate?.id !== 'custom') {
                          setSelectedTemplate(MESSAGE_TEMPLATES.find(t => t.id === 'custom') || null);
                        }
                      }}
                      placeholder="Nhập lời nhắn của bạn..."
                      rows={2}
                      className="pr-12"
                    />
                    <div className="absolute right-2 bottom-2">
                      <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {isLargeAmount && (
                  <div className="flex items-center gap-2 p-2 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-xs text-destructive">Bạn đang gửi hơn 80% số dư token.</p>
                  </div>
                )}
                {needsGasWarning && (
                  <div className="flex items-center gap-2 p-2 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-xs text-destructive">
                      BNB còn {bnbBalanceNum.toFixed(4)}. Cần tối thiểu 0.002 BNB để trả phí gas.
                    </p>
                  </div>
                )}

                {/* Recipient Address Preview */}
                {effectiveRecipientAddress && (
                  <div className="flex items-center justify-between p-3 mb-3 rounded-lg bg-muted/50 border">
                    <span className="text-sm text-muted-foreground">Gửi đến:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {effectiveRecipientAddress.slice(0, 8)}...{effectiveRecipientAddress.slice(-6)}
                      </span>
                      <button type="button" onClick={handleCopyAddress} className="p-1 rounded hover:bg-muted transition-colors" title="Copy địa chỉ ví">
                        <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                )}

                {/* TX Progress */}
                {(isInProgress || txStep === 'success' || txStep === 'timeout') && (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      {txStep === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : txStep === 'timeout' ? (
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                      )}
                      <p className="text-sm font-medium">{stepInfo.label}</p>
                    </div>
                    <Progress value={stepInfo.progress} className="h-2" />
                  </div>
                )}

                {/* BscScan link */}
                {scanUrl && (
                  <Button variant="outline" size="sm" className="w-full gap-2 mb-3" onClick={() => window.open(scanUrl, '_blank')}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    Xem trên BscScan
                  </Button>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  {txStep === 'timeout' ? (
                    <>
                      <Button variant="outline" onClick={handleDialogClose} className="flex-1">Đóng</Button>
                      <Button onClick={recheckReceipt} className="flex-1 gap-2">
                        <RefreshCw className="w-3.5 h-3.5" />Kiểm tra lại
                      </Button>
                    </>
                  ) : txStep === 'success' && !effectiveRecipient?.id ? (
                    <Button variant="outline" onClick={handleDialogClose} className="w-full">Đóng</Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleDialogClose} className="flex-1" disabled={isInProgress || isRecordingDonation}>
                        Hủy
                      </Button>
                      <Button
                        onClick={handleSend}
                        disabled={isSendDisabled || isFormDisabled}
                        className="flex-1 bg-gradient-to-r from-gold to-amber-500 hover:from-gold/90 hover:to-amber-500/90 text-primary-foreground"
                      >
                        {isPending || isInProgress || isRecordingDonation ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang xử lý...</>
                        ) : (
                          <>
                            <Gift className="w-4 h-4 mr-2" />
                            Gửi Tặng {amount && `${parseFloat(amount).toLocaleString()} ${selectedToken.symbol}`}
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Card */}
      {successCardData && (
        <DonationSuccessCard
          isOpen={showSuccessCard}
          onClose={handleCloseSuccessCard}
          data={successCardData}
        />
      )}
    </>
  );
};
