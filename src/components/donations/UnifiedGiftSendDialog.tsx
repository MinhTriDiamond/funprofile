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
import { Loader2, Wallet, Gift, AlertCircle, Send, Copy, AlertTriangle, ExternalLink, CheckCircle2, RefreshCw, Search, User, X, ArrowLeft, ArrowRight, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { EmojiPicker } from '@/components/feed/EmojiPicker';
import { bsc } from 'wagmi/chains';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';

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
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  hasVerifiedWallet?: boolean;
}

interface MultiSendResult {
  recipient: ResolvedRecipient;
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface UnifiedGiftSendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'wallet' | 'post' | 'navbar';
  presetRecipient?: {
    id?: string;
    username?: string;
    displayName?: string | null;
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
  const { activeAddress } = useActiveAccount();
  const effectiveAddress = activeAddress || address;
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
  const [senderProfile, setSenderProfile] = useState<{ username: string; display_name: string | null; avatar_url: string | null; wallet_address: string | null; public_wallet_address: string | null } | null>(null);
  const [senderUserId, setSenderUserId] = useState<string | null>(null);

  // Multi-recipient state
  const [resolvedRecipients, setResolvedRecipients] = useState<ResolvedRecipient[]>([]);
  const [multiSendProgress, setMultiSendProgress] = useState<{ current: number; total: number; results: MultiSendResult[] } | null>(null);
  const [isMultiSending, setIsMultiSending] = useState(false);

  // Recipient search state
  const [searchTab, setSearchTab] = useState<'username' | 'address'>('username');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ResolvedRecipient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch sender profile
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSenderUserId(session.user.id);
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, wallet_address, public_wallet_address')
        .eq('id', session.user.id)
        .single();
      if (data) setSenderProfile(data as any);
    })();
  }, [isOpen, effectiveAddress]);

  // Determine effective recipients
  const isPresetMode = mode === 'post' || (mode === 'navbar' && !!presetRecipient?.id);

  const effectiveRecipients = useMemo(() => {
    if (presetRecipient?.id && presetRecipient?.username) {
      return [{
        id: presetRecipient.id,
        username: presetRecipient.username,
        displayName: presetRecipient.displayName ?? null,
        avatarUrl: presetRecipient.avatarUrl ?? null,
        walletAddress: presetRecipient.walletAddress ?? null,
      }] as ResolvedRecipient[];
    }
    return resolvedRecipients;
  }, [presetRecipient, resolvedRecipients]);

  const recipientsWithWallet = effectiveRecipients.filter(r => !!r.walletAddress);
  const recipientsWithoutWallet = effectiveRecipients.filter(r => !r.walletAddress);
  const hasRecipients = effectiveRecipients.length > 0;
  const isMultiMode = effectiveRecipients.length > 1;

  // Get native BNB balance
  const { data: bnbBalance } = useBalance({ address: effectiveAddress as `0x${string}` | undefined, chainId: bsc.id });

  // Get ERC20 token balance
  const { data: tokenBalance } = useReadContract({
    address: selectedToken.address as `0x${string}` | undefined,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: effectiveAddress ? [effectiveAddress as `0x${string}`] : undefined,
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
  const totalAmount = parsedAmountNum * recipientsWithWallet.length;
  const minSendCheck = parsedAmountNum > 0
    ? validateMinSendValue(parsedAmountNum, selectedTokenPrice)
    : { valid: false } as { valid: boolean; message?: string };
  const estimatedUsd = parsedAmountNum * (selectedTokenPrice || 0);
  const totalEstimatedUsd = estimatedUsd * recipientsWithWallet.length;
  const isValidAmount = minSendCheck.valid;
  const hasEnoughBalance = formattedBalance >= totalAmount;
  const isWrongNetwork = chainId !== bsc.id;
  const needsGasWarning = selectedToken.symbol !== 'BNB' && bnbBalanceNum < 0.002 * recipientsWithWallet.length && parsedAmountNum > 0;
  const isLargeAmount = totalAmount > formattedBalance * 0.8 && totalAmount > 0;

  const isInProgress = ['signing', 'broadcasted', 'confirming', 'finalizing'].includes(txStep);
  const stepInfo = STEP_CONFIG[txStep] || STEP_CONFIG.idle;

  // Resolve wallet address with priority
  const resolveWalletAddress = (profile: any): string | null => {
    return profile.public_wallet_address || profile.external_wallet_address || profile.wallet_address || null;
  };

  // Search for recipient
  const performSearch = useCallback(async (query: string, tab: 'username' | 'address') => {
    if (!query.trim()) { setSearchResults([]); setSearchError(''); return; }
    setIsSearching(true);
    setSearchError('');
    try {
      const selectFields = 'id, username, display_name, avatar_url, wallet_address, public_wallet_address, external_wallet_address';
      if (tab === 'username') {
        const cleanQuery = query.replace(/^@/, '').toLowerCase().trim();
        if (cleanQuery.length < 2) { setSearchResults([]); setIsSearching(false); return; }
        const { data, error } = await supabase
          .from('profiles')
          .select(selectFields)
          .or(`username_normalized.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
          .limit(20);
        if (error) throw error;
        if (data && data.length > 0) {
          setSearchResults(data.map((p: any) => ({
            id: p.id,
            username: p.username,
            displayName: p.display_name || null,
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
        const { data, error } = await supabase
          .from('profiles')
          .select(selectFields)
          .or(`wallet_address.ilike.${addr},public_wallet_address.ilike.${addr},external_wallet_address.ilike.${addr}`)
          .limit(1);
        if (error) throw error;
        if (data && data.length > 0) {
          setSearchResults(data.map((p: any) => ({
            id: p.id,
            username: p.username,
            displayName: p.display_name || null,
            avatarUrl: p.avatar_url,
            walletAddress: resolveWalletAddress(p),
            hasVerifiedWallet: !!(p.public_wallet_address || p.external_wallet_address),
          })));
        } else {
          setSearchResults([]);
          setSearchError('Không tìm thấy FUN username cho địa chỉ này.');
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
    if (!isOpen || isPresetMode) return;
    performSearch(debouncedSearchQuery, searchTab);
  }, [debouncedSearchQuery, searchTab, isOpen, isPresetMode, performSearch]);

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
      setResolvedRecipients([]);
      setMultiSendProgress(null);
      setIsMultiSending(false);
      setFlowStep('form');
      resetState();
    }
  }, [isOpen]);

  const handleSelectRecipient = (recipient: ResolvedRecipient) => {
    // Don't add duplicates or self
    if (resolvedRecipients.some(r => r.id === recipient.id)) {
      toast.info(`@${recipient.username} đã được chọn rồi`);
      return;
    }
    if (recipient.id === senderUserId) {
      toast.error('Không thể tặng quà cho chính mình');
      return;
    }
    setResolvedRecipients(prev => [...prev, recipient]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveRecipient = (recipientId: string) => {
    setResolvedRecipients(prev => prev.filter(r => r.id !== recipientId));
  };

  const handleClearAllRecipients = () => {
    setResolvedRecipients([]);
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
    if (formattedBalance > 0 && recipientsWithWallet.length > 0) {
      const perPerson = selectedToken.symbol === 'BNB'
        ? Math.max(0, (formattedBalance - 0.002 * recipientsWithWallet.length) / recipientsWithWallet.length)
        : formattedBalance / recipientsWithWallet.length;
      setAmount(perPerson.toString());
    }
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success('Đã copy địa chỉ ví');
  };

  const handleEmojiSelect = (emoji: string) => setCustomMessage(prev => prev + emoji);

  // Can proceed to confirm step?
  const canProceedToConfirm = isConnected && recipientsWithWallet.length > 0 && isValidAmount && hasEnoughBalance && !isWrongNetwork;

  const handleGoToConfirm = () => {
    if (!canProceedToConfirm) return;
    setFlowStep('confirm');
  };

  const handleGoBackToForm = () => {
    if (!isInProgress && !isMultiSending) setFlowStep('form');
  };

  // Single send (for 1 recipient)
  const handleSendSingle = async () => {
    const recipient = recipientsWithWallet[0];
    if (!recipient?.walletAddress) {
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

    const hash = await sendToken({ token: walletToken, recipient: recipient.walletAddress, amount });

    if (hash) {
      const cardData: GiftCardData = {
        id: crypto.randomUUID(),
        amount,
        tokenSymbol: selectedToken.symbol,
        senderUsername: senderProfile?.username || 'Unknown',
        senderAvatarUrl: senderProfile?.avatar_url,
        senderId: senderUserId || undefined,
        senderWalletAddress: effectiveAddress,
        recipientUsername: recipient.username || 'Unknown',
        recipientAvatarUrl: recipient.avatarUrl,
        recipientId: recipient.id,
        recipientWalletAddress: recipient.walletAddress,
        message: customMessage,
        txHash: hash,
        lightScoreEarned: Math.floor(parseFloat(amount) / 100),
        createdAt: new Date().toISOString(),
      };

      setCelebrationData(cardData);
      setShowCelebration(true);
      setFlowStep('celebration');

      if (recipient.id) {
        recordDonationBackground(hash, recipient);
      }

      onSuccess?.();
    }
  };

  // Multi send (for multiple recipients)
  const handleSendMulti = async () => {
    if (recipientsWithWallet.length === 0) return;
    
    setIsMultiSending(true);
    const results: MultiSendResult[] = [];
    setMultiSendProgress({ current: 0, total: recipientsWithWallet.length, results: [] });

    const walletToken = {
      symbol: selectedToken.symbol,
      name: selectedToken.name,
      address: selectedToken.address as `0x${string}` | null,
      decimals: selectedToken.decimals,
      logo: selectedToken.logo,
      color: selectedToken.color,
    };

    for (let i = 0; i < recipientsWithWallet.length; i++) {
      const recipient = recipientsWithWallet[i];
      setMultiSendProgress(prev => prev ? { ...prev, current: i + 1 } : prev);

      try {
        resetState();
        const hash = await sendToken({ token: walletToken, recipient: recipient.walletAddress!, amount });
        
        if (hash) {
          results.push({ recipient, success: true, txHash: hash });
          // Record in background
          recordDonationBackground(hash, recipient);
        } else {
          results.push({ recipient, success: false, error: 'Giao dịch bị từ chối' });
        }
      } catch (err: any) {
        results.push({ recipient, success: false, error: err?.message || 'Lỗi gửi' });
      }

      setMultiSendProgress(prev => prev ? { ...prev, results: [...results] } : prev);
    }

    setIsMultiSending(false);

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      const firstSuccess = results.find(r => r.success);
      const cardData: GiftCardData = {
        id: crypto.randomUUID(),
        amount: (parsedAmountNum * successCount).toString(),
        tokenSymbol: selectedToken.symbol,
        senderUsername: senderProfile?.username || 'Unknown',
        senderAvatarUrl: senderProfile?.avatar_url,
        senderId: senderUserId || undefined,
        senderWalletAddress: address,
        recipientUsername: successCount === 1
          ? firstSuccess!.recipient.username
          : `${successCount} người nhận`,
        recipientAvatarUrl: successCount === 1 ? firstSuccess!.recipient.avatarUrl : null,
        recipientId: firstSuccess!.recipient.id,
        recipientWalletAddress: firstSuccess!.recipient.walletAddress || '',
        message: customMessage,
        txHash: firstSuccess!.txHash || '',
        lightScoreEarned: Math.floor(parsedAmountNum * successCount / 100),
        createdAt: new Date().toISOString(),
      };

      setCelebrationData(cardData);
      setShowCelebration(true);
      setFlowStep('celebration');
      onSuccess?.();

      if (results.some(r => !r.success)) {
        const failedNames = results.filter(r => !r.success).map(r => `@${r.recipient.username}`).join(', ');
        toast.warning(`Không gửi được cho: ${failedNames}`, { duration: 8000 });
      }
    } else {
      toast.error('Không gửi được cho bất kỳ người nhận nào');
    }
  };

  const handleSend = async () => {
    if (recipientsWithWallet.length === 1) {
      await handleSendSingle();
    } else {
      await handleSendMulti();
    }
  };

  /** Record donation in background */
  const recordDonationBackground = async (hash: string, recipient: ResolvedRecipient) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      try {
        const { data: donationData, error } = await supabase.functions.invoke('record-donation', {
          body: {
            sender_id: session.user.id,
            recipient_id: recipient.id,
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
          // Update celebration data with real DB ID (only for single send)
          if (recipientsWithWallet.length === 1) {
            setCelebrationData(prev => prev ? {
              ...prev,
              id: donationData.donation.id,
              lightScoreEarned: donationData.light_score_earned || prev.lightScoreEarned,
            } : prev);
          }
          localStorage.removeItem(`pending_donation_${hash}`);
        } else {
          throw new Error(error?.message || 'Record failed');
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('[GIFT] record-donation failed/timeout:', err?.message);
        localStorage.setItem(`pending_donation_${hash}`, JSON.stringify({
          txHash: hash,
          recipientId: recipient.id,
          senderId: session.user.id,
          amount,
          tokenSymbol: selectedToken.symbol,
          message: customMessage,
          timestamp: Date.now(),
        }));
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
    const noWalletRecipient = recipientsWithoutWallet[0];
    if (!noWalletRecipient?.id) return;
    setIsSendingReminder(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Bạn cần đăng nhập'); return; }
      const { error } = await supabase.functions.invoke('notify-gift-ready', {
        body: { recipientId: noWalletRecipient.id, notificationType: 'no_wallet' },
      });
      if (error) throw error;
      toast.success(`Đã gửi hướng dẫn nhận quà cho @${noWalletRecipient.username}!`);
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
    if (txStep === 'signing' || isMultiSending) return;
    onClose();
  };

  const dialogTitle = useMemo(() => {
    if (effectiveRecipients.length === 1) {
      return `Trao gửi yêu thương cho @${effectiveRecipients[0].username} 🎁❤️🎉`;
    }
    if (effectiveRecipients.length > 1) {
      return `Trao gửi yêu thương cho ${effectiveRecipients.length} người 🎁❤️🎉`;
    }
    return 'Trao gửi yêu thương 🎁❤️🎉';
  }, [effectiveRecipients]);

  const scanUrl = txHash ? getBscScanTxUrl(txHash, selectedToken.symbol) : null;
  const isSendDisabled = !isConnected || recipientsWithWallet.length === 0 || !isValidAmount || !hasEnoughBalance || isPending || isInProgress || isWrongNetwork || isMultiSending;

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
                      <p className="font-medium truncate">{senderProfile.display_name || senderProfile.username}</p>
                      <p className="text-xs text-muted-foreground truncate">@{senderProfile.username}</p>
                      {effectiveAddress && (
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground font-mono truncate">{effectiveAddress.slice(0, 8)}...{effectiveAddress.slice(-6)}</p>
                          <button type="button" onClick={() => handleCopyAddress(effectiveAddress)} className="p-0.5 hover:bg-muted rounded">
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Wallet mismatch warning */}
                  {effectiveAddress && senderProfile.wallet_address && senderProfile.public_wallet_address &&
                    effectiveAddress.toLowerCase() !== senderProfile.wallet_address?.toLowerCase() &&
                    effectiveAddress.toLowerCase() !== senderProfile.public_wallet_address?.toLowerCase() && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-700">Ví đang kết nối khác với ví đã lưu trong hồ sơ. Giao dịch sẽ gửi từ ví hiện tại.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Token */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Chọn token:</label>
                <TokenSelector selectedToken={selectedToken} onSelect={setSelectedToken} />
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Số lượng {isMultiMode ? `(mỗi người)` : ''}:
                </label>
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
                {estimatedUsd > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ ${estimatedUsd.toFixed(4)} USD{isMultiMode ? ` × ${recipientsWithWallet.length} = $${totalEstimatedUsd.toFixed(4)} USD tổng` : ''}
                  </p>
                )}
                {isMultiMode && parsedAmountNum > 0 && (
                  <p className="text-xs font-medium text-amber-600 mt-1">
                    Tổng: {totalAmount.toLocaleString()} {selectedToken.symbol} cho {recipientsWithWallet.length} người
                  </p>
                )}
                {parsedAmountNum > 0 && !minSendCheck.valid && minSendCheck.message && <p className="text-xs text-destructive mt-1">{minSendCheck.message}</p>}
                {parsedAmountNum > 0 && !hasEnoughBalance && (
                  <p className="text-xs text-destructive mt-1">Không đủ số dư (cần {totalAmount.toLocaleString()} {selectedToken.symbol})</p>
                )}
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
              {!isConnected && (
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

              {/* Recipient section */}
              {isPresetMode ? (
                /* Preset single recipient */
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Người nhận:</label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                    <Avatar className="w-10 h-10 border-2 border-gold/30">
                      <AvatarImage src={effectiveRecipients[0]?.avatarUrl || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {effectiveRecipients[0]?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{effectiveRecipients[0]?.displayName || effectiveRecipients[0]?.username}</p>
                      <p className="text-xs text-muted-foreground truncate">@{effectiveRecipients[0]?.username}</p>
                      {effectiveRecipients[0]?.walletAddress && (
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground font-mono truncate">{effectiveRecipients[0].walletAddress.slice(0, 8)}...{effectiveRecipients[0].walletAddress.slice(-6)}</p>
                          <button type="button" onClick={() => handleCopyAddress(effectiveRecipients[0].walletAddress!)} className="p-0.5 hover:bg-muted rounded">
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Search & multi-select recipients */
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Người nhận {resolvedRecipients.length > 0 && <span className="text-primary">({resolvedRecipients.length} đã chọn)</span>}:
                  </label>

                  {/* Selected recipients chips */}
                  {resolvedRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {resolvedRecipients.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm"
                        >
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={r.avatarUrl || ''} />
                            <AvatarFallback className="bg-primary/20 text-primary text-[10px]">{r.username[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate max-w-[100px]">{r.displayName || r.username}</span>
                          {!r.walletAddress && <AlertCircle className="w-3 h-3 text-destructive shrink-0" />}
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(r.id)}
                            className="p-0.5 rounded-full hover:bg-destructive/10 transition-colors"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                      {resolvedRecipients.length > 1 && (
                        <button
                          type="button"
                          onClick={handleClearAllRecipients}
                          className="text-xs text-destructive hover:underline px-2 py-1"
                        >
                          Xóa tất cả
                        </button>
                      )}
                    </div>
                  )}

                  {/* Search input */}
                  <div className="space-y-2">
                    <Tabs value={searchTab} onValueChange={(v) => { setSearchTab(v as 'username' | 'address'); setSearchQuery(''); setSearchResults([]); setSearchError(''); }}>
                      <TabsList className="w-full">
                        <TabsTrigger value="username" className="flex-1 text-xs gap-1"><User className="w-3.5 h-3.5" />Tìm theo username</TabsTrigger>
                        <TabsTrigger value="address" className="flex-1 text-xs gap-1"><Wallet className="w-3.5 h-3.5" />Tìm theo địa chỉ ví</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchTab === 'username' ? '@username... (chọn nhiều người)' : '0x...'}
                        className={`pl-9 text-sm ${searchTab === 'address' ? 'font-mono' : ''}`}
                      />
                      {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {searchResults
                          .filter(result => !resolvedRecipients.some(r => r.id === result.id))
                          .map((result) => (
                          <button key={result.id} type="button" onClick={() => handleSelectRecipient(result)} className="w-full flex items-center gap-3 p-2.5 hover:bg-accent transition-colors text-left">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={result.avatarUrl || ''} />
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">{result.username[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-sm truncate">{result.displayName || result.username}</p>
                                {result.hasVerifiedWallet && <Shield className="w-3 h-3 text-emerald-500 shrink-0" />}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">@{result.username}</p>
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
                </div>
              )}

              {/* No wallet warning (for recipients without wallets) */}
              {recipientsWithoutWallet.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">
                      {recipientsWithoutWallet.length} người chưa có ví:
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    {recipientsWithoutWallet.map(r => `@${r.username}`).join(', ')} — sẽ bị bỏ qua khi gửi.
                  </p>
                </div>
              )}

              {/* No wallet - all recipients have no wallet */}
              {hasRecipients && recipientsWithWallet.length === 0 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Không có người nhận nào có ví</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Tất cả người nhận cần kết nối ví Web3 trước khi có thể nhận quà.</p>
                  </div>
                  <Button onClick={handleSendReminder} disabled={isSendingReminder} className="w-full bg-gradient-to-r from-primary to-primary/80">
                    {isSendingReminder ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang gửi...</> : <><Send className="w-4 h-4 mr-2" />Hướng Dẫn Nhận Quà</>}
                  </Button>
                </div>
              )}

              {(recipientsWithWallet.length > 0 || !hasRecipients) && (
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
                      <p className="text-xs text-destructive">BNB còn {bnbBalanceNum.toFixed(4)}. Cần khoảng {(0.002 * recipientsWithWallet.length).toFixed(4)} BNB phí gas cho {recipientsWithWallet.length} giao dịch.</p>
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
              <div className="bg-muted/30 rounded-xl p-4 space-y-4 border">
                {/* Sender */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-primary/30">
                    <AvatarImage src={senderProfile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/20 text-primary">{senderProfile?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{senderProfile?.display_name || senderProfile?.username}</p>
                    <p className="text-xs text-muted-foreground">@{senderProfile?.username}</p>
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
                  <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-full bg-gradient-to-r from-gold/20 to-amber-500/20 border border-gold/50">
                    <span className="text-lg font-bold text-amber-800">
                      {isMultiMode
                        ? `${Number(amount).toLocaleString()} × ${recipientsWithWallet.length} = ${totalAmount.toLocaleString()} ${selectedToken.symbol}`
                        : `${Number(amount).toLocaleString()} ${selectedToken.symbol}`
                      }
                    </span>
                    {isMultiMode && totalEstimatedUsd > 0 && (
                      <span className="text-xs text-amber-600">≈ ${totalEstimatedUsd.toFixed(2)} USD tổng</span>
                    )}
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Recipients */}
                {isMultiMode ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gold" />
                      <span className="text-sm font-medium">{recipientsWithWallet.length} người nhận — mỗi người {Number(amount).toLocaleString()} {selectedToken.symbol}</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {recipientsWithWallet.map((recipient, idx) => {
                        const result = multiSendProgress?.results.find(r => r.recipient.id === recipient.id);
                        return (
                          <div key={recipient.id} className={`flex items-center gap-2.5 p-2 rounded-lg border ${
                            result?.success ? 'bg-emerald-50 border-emerald-200' :
                            result && !result.success ? 'bg-destructive/5 border-destructive/20' :
                            multiSendProgress && multiSendProgress.current === idx + 1 ? 'bg-primary/5 border-primary/30' :
                            'bg-muted/30'
                          }`}>
                            <Avatar className="w-8 h-8 border border-gold/20">
                              <AvatarImage src={recipient.avatarUrl || ''} />
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">{recipient.username[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{recipient.displayName || recipient.username}</p>
                              {recipient.walletAddress && (
                                <p className="text-[10px] text-muted-foreground font-mono truncate">{recipient.walletAddress.slice(0, 8)}...{recipient.walletAddress.slice(-6)}</p>
                              )}
                            </div>
                            {result?.success && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                            {result && !result.success && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                            {multiSendProgress && multiSendProgress.current === idx + 1 && !result && (
                              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-gold/30">
                      <AvatarImage src={recipientsWithWallet[0]?.avatarUrl || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary">{recipientsWithWallet[0]?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{recipientsWithWallet[0]?.displayName || recipientsWithWallet[0]?.username}</p>
                      <p className="text-xs text-muted-foreground">@{recipientsWithWallet[0]?.username}</p>
                      {recipientsWithWallet[0]?.walletAddress && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground font-mono">{recipientsWithWallet[0].walletAddress.slice(0, 8)}...{recipientsWithWallet[0].walletAddress.slice(-6)}</span>
                          <button type="button" onClick={() => handleCopyAddress(recipientsWithWallet[0].walletAddress!)} className="p-0.5 hover:bg-muted rounded"><Copy className="w-3 h-3 text-muted-foreground" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                <p className="text-xs text-amber-700 font-medium">
                  {isMultiMode
                    ? `Sẽ gửi ${recipientsWithWallet.length} giao dịch riêng biệt. Mỗi giao dịch cần xác nhận trong ví. Không thể hoàn tác.`
                    : 'Giao dịch blockchain không thể hoàn tác. Vui lòng kiểm tra kỹ trước khi xác nhận.'
                  }
                </p>
              </div>

              {/* Multi-send progress */}
              {multiSendProgress && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    <p className="text-sm font-medium">
                      Đang gửi {multiSendProgress.current}/{multiSendProgress.total}...
                    </p>
                  </div>
                  <Progress value={(multiSendProgress.results.length / multiSendProgress.total) * 100} className="h-2" />
                  {multiSendProgress.results.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ✅ {multiSendProgress.results.filter(r => r.success).length} thành công
                      {multiSendProgress.results.some(r => !r.success) && ` · ❌ ${multiSendProgress.results.filter(r => !r.success).length} thất bại`}
                    </p>
                  )}
                </div>
              )}

              {/* Single send TX Progress */}
              {!isMultiMode && (isInProgress || txStep === 'success' || txStep === 'timeout') && (
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

              {scanUrl && !isMultiMode && (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => window.open(scanUrl, '_blank')}>
                  <ExternalLink className="w-3.5 h-3.5" />Xem trên BscScan
                </Button>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {txStep === 'timeout' && !isMultiMode ? (
                  <>
                    <Button variant="outline" onClick={handleDialogClose} className="flex-1">Đóng</Button>
                    <Button onClick={recheckReceipt} className="flex-1 gap-2"><RefreshCw className="w-3.5 h-3.5" />Kiểm tra lại</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleGoBackToForm} className="flex-1 gap-2" disabled={isInProgress || isMultiSending}>
                      <ArrowLeft className="w-4 h-4" />Quay lại
                    </Button>
                    <Button onClick={handleSend} disabled={isSendDisabled} className="flex-1 bg-gradient-to-r from-gold to-amber-500 hover:from-gold/90 hover:to-amber-500/90 text-primary-foreground">
                      {isPending || isInProgress || isMultiSending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang xử lý...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-2" />
                          {isMultiMode ? `Xác nhận & Tặng ${recipientsWithWallet.length} người` : 'Xác nhận & Tặng'}
                        </>
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
          editable={!isMultiMode}
          onSaveTheme={handleSaveTheme}
        />
      )}
    </>
  );
};
