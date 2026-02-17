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
import { GiftCelebrationModal, GiftCardData } from './GiftCelebrationModal';
import { useSendToken, TxStep } from '@/hooks/useSendToken';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { validateMinSendValue } from '@/lib/minSendValidation';
import { validateEvmAddress } from '@/utils/walletValidation';
import { useDebounce } from '@/hooks/useDebounce';
import { useAccount, useBalance, useReadContract, useChainId, useSwitchChain } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Loader2, Wallet, Gift, AlertCircle, Send, Copy, AlertTriangle, ExternalLink, CheckCircle2, RefreshCw, Search, User, X, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
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

type FlowStep = 'form' | 'confirm' | 'celebration';

interface ResolvedRecipient {
  id: string;
  username: string;
  avatarUrl: string | null;
  walletAddress: string | null;
  hasVerifiedWallet?: boolean;
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

  // Default to CAMLY
  const defaultToken = SUPPORTED_TOKENS.find(t => t.symbol === 'CAMLY') || SUPPORTED_TOKENS[0];
  const [flowStep, setFlowStep] = useState<FlowStep>('form');
  const [selectedToken, setSelectedToken] = useState<TokenOption>(defaultToken);
  const [amount, setAmount] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<GiftCardData | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Sender profile
  const [senderProfile, setSenderProfile] = useState<{ username: string; avatar_url: string | null; wallet_address: string | null } | null>(null);
  const [senderUserId, setSenderUserId] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);

  // Recipient search state
  const [searchTab, setSearchTab] = useState<'username' | 'address'>('username');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ResolvedRecipient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [resolvedRecipient, setResolvedRecipient] = useState<ResolvedRecipient | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Fetch sender profile + check restricted status
  useEffect(() => {
    if (!isOpen) return;
    setIsRestricted(false);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSenderUserId(session.user.id);
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url, wallet_address, reward_status, is_banned')
        .eq('id', session.user.id)
        .single();
      if (data) {
        setSenderProfile(data);
        setIsRestricted(
          data.is_banned === true ||
          data.reward_status === 'pending'
        );
      }
    })();
  }, [isOpen]);

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
  // isFormDisabled removed — form fields are always visible, only the confirm button is gated

  // Get native BNB balance
  const { data: bnbBalance } = useBalance({ address, chainId: bsc.id });

  // Get ERC20 token balance
  const { data: tokenBalance } = useReadContract({
    address: selectedToken.address as `0x${string}` | undefined,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: bsc.id,
  });

  const formattedBalance = useMemo(() => {
    if (selectedToken.symbol === 'BNB') return bnbBalance ? parseFloat(bnbBalance.formatted) : 0;
    if (tokenBalance) return parseFloat(formatUnits(tokenBalance as bigint, selectedToken.decimals));
    return 0;
  }, [selectedToken, bnbBalance, tokenBalance]);

  const bnbBalanceNum = useMemo(() => bnbBalance ? parseFloat(bnbBalance.formatted) : 0, [bnbBalance]);

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

  // Resolve wallet address with priority: public_wallet_address > external_wallet_address > wallet_address
  const resolveWalletAddress = (profile: any): string | null => {
    return profile.public_wallet_address || profile.external_wallet_address || profile.wallet_address || null;
  };

  // Search for recipient
  const performSearch = useCallback(async (query: string, tab: 'username' | 'address') => {
    if (!query.trim()) { setSearchResults([]); setSearchError(''); return; }
    setIsSearching(true);
    setSearchError('');
    try {
      const selectFields = 'id, username, avatar_url, wallet_address, public_wallet_address, external_wallet_address';
      if (tab === 'username') {
        const cleanQuery = query.replace(/^@/, '').toLowerCase().trim();
        if (cleanQuery.length < 2) { setSearchResults([]); setIsSearching(false); return; }
        // Search using username_normalized for case-insensitive matching
        const { data, error } = await supabase
          .from('profiles')
          .select(selectFields)
          .ilike('username_normalized', `%${cleanQuery}%`)
          .limit(5);
        if (error) throw error;
        if (data && data.length > 0) {
          setSearchResults(data.map(p => ({
            id: p.id,
            username: p.username,
            avatarUrl: p.avatar_url,
            walletAddress: resolveWalletAddress(p),
            hasVerifiedWallet: !!(p.public_wallet_address || p.external_wallet_address),
          })));
        } else {
          setSearchResults([]);
          setSearchError('Không tìm thấy người dùng');
        }
      } else {
        const addr = query.trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
          setSearchResults([]);
          if (addr.length > 3) setSearchError('Địa chỉ ví không hợp lệ');
          setIsSearching(false);
          return;
        }
        // Search across all wallet columns
        const { data, error } = await supabase
          .from('profiles')
          .select(selectFields)
          .or(`wallet_address.ilike.${addr},public_wallet_address.ilike.${addr},external_wallet_address.ilike.${addr}`)
          .limit(1);
        if (error) throw error;
        if (data && data.length > 0) {
          setSearchResults(data.map(p => ({
            id: p.id,
            username: p.username,
            avatarUrl: p.avatar_url,
            walletAddress: resolveWalletAddress(p),
            hasVerifiedWallet: !!(p.public_wallet_address || p.external_wallet_address),
          })));
        } else {
          setSearchResults([]);
          setSearchError('Không tìm thấy FUN username cho địa chỉ này. Chỉ có thể gửi đến user có tài khoản FUN Profile.');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Lỗi khi tìm kiếm');
    } finally {
      setIsSearching(false);
    }
  }, []);

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
      setSelectedToken(defaultToken);
      setShowCelebration(false);
      setCelebrationData(null);
      setSearchTab('username');
      setSearchQuery('');
      setSearchResults([]);
      setSearchError('');
      setResolvedRecipient(null);
      setFlowStep('form');
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
    if (template.id !== 'custom') setCustomMessage(template.message);
    else setCustomMessage('');
  };

  const handleSelectQuickAmount = (quickAmount: number) => setAmount(quickAmount.toString());

  const handleMaxAmount = () => {
    if (formattedBalance > 0) {
      if (selectedToken.symbol === 'BNB') {
        setAmount(Math.max(0, formattedBalance - 0.002).toString());
      } else {
        setAmount(formattedBalance.toString());
      }
    }
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success('Đã copy địa chỉ ví');
  };

  const handleEmojiSelect = (emoji: string) => setCustomMessage(prev => prev + emoji);

  // Can proceed to confirm step?
  const canProceedToConfirm = isConnected && effectiveRecipientAddress && isValidAmount && hasEnoughBalance && !isWrongNetwork && !isRestricted;

  const handleGoToConfirm = () => {
    if (!canProceedToConfirm) return;
    setFlowStep('confirm');
  };

  const handleGoBackToForm = () => {
    if (!isInProgress) setFlowStep('form');
  };

  const handleSend = async () => {
    if (!effectiveRecipientAddress) {
      toast.error('Người nhận chưa có ví liên kết');
      return;
    }

    const walletToken = {
      symbol: selectedToken.symbol,
      name: selectedToken.name,
      address: selectedToken.address as `0x${string}` | null,
      decimals: selectedToken.decimals,
      logo: selectedToken.logo,
      color: selectedToken.color,
    };

    const hash = await sendToken({ token: walletToken, recipient: effectiveRecipientAddress, amount });

    if (hash) {
      // CREATE celebration data IMMEDIATELY — don't wait for edge function
      const cardData: GiftCardData = {
        id: crypto.randomUUID(),
        amount,
        tokenSymbol: selectedToken.symbol,
        senderUsername: senderProfile?.username || 'Unknown',
        senderAvatarUrl: senderProfile?.avatar_url,
        senderId: senderUserId || undefined,
        senderWalletAddress: address,
        recipientUsername: effectiveRecipient!.username || 'Unknown',
        recipientAvatarUrl: effectiveRecipient!.avatarUrl,
        recipientId: effectiveRecipient!.id,
        recipientWalletAddress: effectiveRecipientAddress,
        message: customMessage,
        txHash: hash,
        lightScoreEarned: Math.floor(parseFloat(amount) / 100),
        createdAt: new Date().toISOString(),
      };

      // SHOW CELEBRATION IMMEDIATELY
      setCelebrationData(cardData);
      setShowCelebration(true);
      setFlowStep('celebration');

      // RECORD TO DB IN BACKGROUND (non-blocking)
      if (effectiveRecipient?.id) {
        recordDonationBackground(hash, cardData);
      }

      onSuccess?.();
    }
  };

  /** Record donation in background with 10s timeout — never blocks UI */
  const recordDonationBackground = async (hash: string, _cardData: GiftCardData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 10s timeout for edge function
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      try {
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
        clearTimeout(timeoutId);

        if (!error && donationData?.donation?.id) {
          console.log('[GIFT] record-donation OK:', donationData.donation.id);
          // Update celebration data with real DB ID
          setCelebrationData(prev => prev ? {
            ...prev,
            id: donationData.donation.id,
            lightScoreEarned: donationData.light_score_earned || prev.lightScoreEarned,
          } : prev);
          localStorage.removeItem(`pending_donation_${hash}`);
        } else {
          throw new Error(error?.message || 'Record failed');
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('[GIFT] record-donation failed/timeout:', err?.message);
        // Save to localStorage as fallback
        localStorage.setItem(`pending_donation_${hash}`, JSON.stringify({
          txHash: hash,
          recipientId: effectiveRecipient!.id,
          senderId: session.user.id,
          amount,
          tokenSymbol: selectedToken.symbol,
          message: customMessage,
          timestamp: Date.now(),
        }));
        toast.warning('Chưa ghi nhận được vào hệ thống. Hệ thống sẽ tự đồng bộ.', { duration: 6000 });
      }
    } catch (err) {
      console.error('[GIFT] recordDonationBackground outer error:', err);
    }
  };

  const handleSaveTheme = async (themeId: string, bgIndex: number, soundId: string) => {
    if (!celebrationData?.id) return;
    try {
      await supabase.from('donations').update({
        card_theme: themeId,
        card_background: bgIndex.toString(),
        card_sound: soundId,
      } as any).eq('id', celebrationData.id);
    } catch (err) {
      console.error('Save theme error:', err);
    }
  };

  const handleSendReminder = async () => {
    if (!effectiveRecipient?.id) return;
    setIsSendingReminder(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Bạn cần đăng nhập'); return; }
      const { error } = await supabase.functions.invoke('notify-gift-ready', {
        body: { recipientId: effectiveRecipient.id, notificationType: 'no_wallet' },
      });
      if (error) throw error;
      toast.success(`Đã gửi hướng dẫn nhận quà cho @${effectiveRecipient.username}!`);
      onClose();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Không thể gửi hướng dẫn.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    setCelebrationData(null);
    onClose();
  };

  const handleDialogClose = () => {
    if (txStep === 'signing') return; // only block during wallet signing
    onClose();
  };

  const dialogTitle = effectiveRecipient?.username
    ? `Trao gửi yêu thương cho @${effectiveRecipient.username} 🎁❤️🎉`
    : 'Trao gửi yêu thương 🎁❤️🎉';

  const recipientHasNoWallet = hasRecipient && !effectiveRecipientAddress;
  const isPresetMode = mode === 'post' || (mode === 'navbar' && !!presetRecipient?.id);
  const scanUrl = txHash ? getBscScanTxUrl(txHash, selectedToken.symbol) : null;

  const isSendDisabled = !isConnected || !effectiveRecipientAddress || !isValidAmount || !hasEnoughBalance || isPending || isInProgress || isWrongNetwork;

  const showMainDialog = isOpen && flowStep !== 'celebration';

  return (
    <>
      <Dialog open={showMainDialog} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="w-[95vw] max-w-md lg:max-w-[720px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Gift className="w-5 h-5 text-gold shrink-0" />
              <span className="break-words">{dialogTitle}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-2">
            {['form', 'confirm'].map((step, idx) => (
              <div key={step} className="flex items-center gap-1 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  flowStep === step ? 'bg-primary text-primary-foreground' :
                  (flowStep === 'confirm' && idx === 0) ? 'bg-primary/20 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {idx + 1}
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {idx === 0 ? 'Thông tin' : 'Xác nhận'}
                </span>
                {idx < 1 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* ========== STEP 1: FORM ========== */}
          {flowStep === 'form' && (
            <div className="space-y-5 py-2">
              {/* Restricted account warning */}
              {isRestricted && (
                <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">Tài khoản đang bị hạn chế</p>
                    <p className="text-xs text-destructive/80 mt-0.5">Bạn không thể gửi token hoặc tặng quà. Vui lòng liên hệ Admin.</p>
                  </div>
                </div>
              )}
              {/* Sender info */}
              {senderProfile && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Người gửi:</label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                    <Avatar className="w-10 h-10 border-2 border-primary/30">
                      <AvatarImage src={senderProfile.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {senderProfile.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">@{senderProfile.username}</p>
                      {address && (
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground font-mono truncate">{address.slice(0, 8)}...{address.slice(-6)}</p>
                          <button type="button" onClick={() => handleCopyAddress(address)} className="p-0.5 hover:bg-muted rounded">
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Token */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Chọn token:</label>
                <TokenSelector selectedToken={selectedToken} onSelect={setSelectedToken} />
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Số lượng:</label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setAmount(val);
                    }}
                    placeholder="0"
                    className="text-lg font-semibold pr-16 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-sm text-muted-foreground">{selectedToken.symbol}</span>
                  </div>
                </div>
                {isConnected && <p className="text-xs text-muted-foreground mt-1">Số dư: {formattedBalance.toLocaleString(undefined, { maximumFractionDigits: selectedToken.decimals })} {selectedToken.symbol}</p>}
                {estimatedUsd > 0 && <p className="text-xs text-muted-foreground mt-1">≈ ${estimatedUsd.toFixed(4)} USD</p>}
                {parsedAmountNum > 0 && !minSendCheck.valid && minSendCheck.message && <p className="text-xs text-destructive mt-1">{minSendCheck.message}</p>}
              </div>

              {/* Wrong network */}
              {isWrongNetwork && isConnected && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive flex-1">Vui lòng chuyển sang BNB Smart Chain</p>
                  <Button size="sm" variant="outline" onClick={() => switchChain({ chainId: bsc.id })}>Switch</Button>
                </div>
              )}

              {/* Connect wallet */}
              {!isConnected && !recipientHasNoWallet && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Wallet className="w-5 h-5" />
                      <span className="font-medium">Kết nối ví để gửi</span>
                    </div>
                    <Button onClick={() => openConnectModal?.()} size="sm" className="bg-amber-500 hover:bg-amber-600">Kết nối</Button>
                  </div>
                </div>
              )}

              {/* Recipient */}
              {isPresetMode ? (
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
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground font-mono truncate">{effectiveRecipientAddress.slice(0, 8)}...{effectiveRecipientAddress.slice(-6)}</p>
                          <button type="button" onClick={() => handleCopyAddress(effectiveRecipientAddress)} className="p-0.5 hover:bg-muted rounded">
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Người nhận:</label>
                  {resolvedRecipient ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                      <Avatar className="w-10 h-10 border-2 border-gold/30">
                        <AvatarImage src={resolvedRecipient.avatarUrl || ''} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {resolvedRecipient.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-medium truncate">@{resolvedRecipient.username}</p>
                            {resolvedRecipient.hasVerifiedWallet && (
                              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          {resolvedRecipient.walletAddress && (
                            <div className="flex items-center gap-1">
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {resolvedRecipient.walletAddress.slice(0, 8)}...{resolvedRecipient.walletAddress.slice(-6)}
                              </p>
                              <button type="button" onClick={() => handleCopyAddress(resolvedRecipient.walletAddress!)} className="p-0.5 hover:bg-muted rounded">
                                <Copy className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                        </div>
                      <button type="button" onClick={handleClearRecipient} className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Tabs value={searchTab} onValueChange={(v) => { setSearchTab(v as 'username' | 'address'); setSearchQuery(''); setSearchResults([]); setSearchError(''); }}>
                        <TabsList className="w-full">
                          <TabsTrigger value="username" className="flex-1 text-xs gap-1"><User className="w-3.5 h-3.5" />Tìm theo username</TabsTrigger>
                          <TabsTrigger value="address" className="flex-1 text-xs gap-1"><Wallet className="w-3.5 h-3.5" />Tìm theo địa chỉ ví</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={searchTab === 'username' ? '@username...' : '0x...'} className={`pl-9 text-sm ${searchTab === 'address' ? 'font-mono' : ''}`} />
                        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                      {searchResults.length > 0 && (
                        <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                          {searchResults.map((result) => (
                            <button key={result.id} type="button" onClick={() => handleSelectRecipient(result)} className="w-full flex items-center gap-3 p-2.5 hover:bg-accent transition-colors text-left">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={result.avatarUrl || ''} />
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">{result.username[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="font-medium text-sm truncate">@{result.username}</p>
                                  {result.hasVerifiedWallet && (
                                    <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
                                  )}
                                </div>
                                {result.walletAddress && <p className="text-xs text-muted-foreground font-mono truncate">{result.walletAddress.slice(0, 8)}...{result.walletAddress.slice(-6)}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
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

              {/* No wallet warning */}
              {recipientHasNoWallet && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Người nhận chưa thiết lập ví</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Người này cần kết nối ví Web3 trước khi có thể nhận quà.</p>
                  </div>
                  <Button onClick={handleSendReminder} disabled={isSendingReminder} className="w-full bg-gradient-to-r from-primary to-primary/80">
                    {isSendingReminder ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang gửi...</> : <><Send className="w-4 h-4 mr-2" />Hướng Dẫn Nhận Quà</>}
                  </Button>
                </div>
              )}

              {!recipientHasNoWallet && (
                <>
                  {/* Quick picks */}
                  <div>
                    <QuickGiftPicker selectedTemplate={selectedTemplate} onSelectTemplate={handleSelectTemplate} onSelectAmount={handleSelectQuickAmount} currentAmount={amount} tokenSymbol={selectedToken.symbol} />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Lời nhắn:</label>
                    <div className="relative">
                      <Textarea value={customMessage} onChange={(e) => { setCustomMessage(e.target.value); if (selectedTemplate?.id !== 'custom') setSelectedTemplate(MESSAGE_TEMPLATES.find(t => t.id === 'custom') || null); }} placeholder="Nhập lời nhắn của bạn..." rows={2} className="pr-12" />
                      <div className="absolute right-2 bottom-2"><EmojiPicker onEmojiSelect={handleEmojiSelect} /></div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {isLargeAmount && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive">Bạn đang gửi hơn 80% số dư token.</p>
                    </div>
                  )}
                  {needsGasWarning && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive">BNB còn {bnbBalanceNum.toFixed(4)}. Cần tối thiểu 0.002 BNB để trả phí gas.</p>
                    </div>
                  )}

                  {/* Next button */}
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={handleDialogClose} className="flex-1" disabled={isInProgress}>Hủy</Button>
                    <Button onClick={handleGoToConfirm} disabled={!canProceedToConfirm} className="flex-1 bg-gradient-to-r from-gold to-amber-500 hover:from-gold/90 hover:to-amber-500/90 text-primary-foreground gap-2">
                      Xem lại & Xác nhận <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========== STEP 2: CONFIRM ========== */}
          {flowStep === 'confirm' && (
            <div className="space-y-4 py-2">
              {/* Confirm table */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-4 border">
                {/* Sender */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-primary/30">
                    <AvatarImage src={senderProfile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/20 text-primary">{senderProfile?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">@{senderProfile?.username}</p>
                    {address && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-mono">{address.slice(0, 8)}...{address.slice(-6)}</span>
                        <button type="button" onClick={() => handleCopyAddress(address)} className="p-0.5 hover:bg-muted rounded"><Copy className="w-3 h-3 text-muted-foreground" /></button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow + Amount */}
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="h-px flex-1 bg-border" />
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gold/20 to-amber-500/20 border border-gold/50">
                    <span className="text-lg font-bold text-amber-800">{Number(amount).toLocaleString()} {selectedToken.symbol}</span>
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Recipient */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-gold/30">
                    <AvatarImage src={effectiveRecipient?.avatarUrl || ''} />
                    <AvatarFallback className="bg-primary/20 text-primary">{effectiveRecipient?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">@{effectiveRecipient?.username}</p>
                    {effectiveRecipientAddress && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-mono">{effectiveRecipientAddress.slice(0, 8)}...{effectiveRecipientAddress.slice(-6)}</span>
                        <button type="button" onClick={() => handleCopyAddress(effectiveRecipientAddress)} className="p-0.5 hover:bg-muted rounded"><Copy className="w-3 h-3 text-muted-foreground" /></button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message */}
                {customMessage && (
                  <div className="bg-white/80 rounded-lg p-3 border">
                    <p className="text-sm text-muted-foreground mb-1">Lời nhắn:</p>
                    <p className="text-sm italic">"{customMessage}"</p>
                  </div>
                )}

                {/* Chain info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Chain: BSC (BNB Smart Chain)</span>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 font-medium">Giao dịch blockchain không thể hoàn tác. Vui lòng kiểm tra kỹ trước khi xác nhận.</p>
              </div>

              {/* TX Progress */}
              {(isInProgress || txStep === 'success' || txStep === 'timeout') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {txStep === 'success' ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> :
                     txStep === 'timeout' ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0" /> :
                     <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                    <p className="text-sm font-medium">{stepInfo.label}</p>
                  </div>
                  <Progress value={stepInfo.progress} className="h-2" />
                </div>
              )}

              {scanUrl && (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => window.open(scanUrl, '_blank')}>
                  <ExternalLink className="w-3.5 h-3.5" />Xem trên BscScan
                </Button>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {txStep === 'timeout' ? (
                  <>
                    <Button variant="outline" onClick={handleDialogClose} className="flex-1">Đóng</Button>
                    <Button onClick={recheckReceipt} className="flex-1 gap-2"><RefreshCw className="w-3.5 h-3.5" />Kiểm tra lại</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleGoBackToForm} className="flex-1 gap-2" disabled={isInProgress}>
                      <ArrowLeft className="w-4 h-4" />Quay lại
                    </Button>
                    <Button onClick={handleSend} disabled={isSendDisabled} className="flex-1 bg-gradient-to-r from-gold to-amber-500 hover:from-gold/90 hover:to-amber-500/90 text-primary-foreground">
                      {isPending || isInProgress ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang xử lý...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-2" />Xác nhận & Tặng</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Celebration Modal */}
      {celebrationData && (
        <GiftCelebrationModal
          isOpen={showCelebration}
          onClose={handleCloseCelebration}
          data={celebrationData}
          editable={true}
          onSaveTheme={handleSaveTheme}
        />
      )}
    </>
  );
};
