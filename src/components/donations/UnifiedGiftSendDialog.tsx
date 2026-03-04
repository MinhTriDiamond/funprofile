/**
 * SR-2: UnifiedGiftSendDialog — Orchestrator
 * Refactored from 1293-line God Component into ~200-line orchestrator.
 * UI delegated to GiftFormStep + GiftConfirmStep.
 * Search logic in useRecipientSearch hook.
 * Donation recording remains here (interacts with celebration state).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import logger from '@/lib/logger';
import { SUPPORTED_TOKENS, TokenOption } from './TokenSelector';
import { MessageTemplate, MESSAGE_TEMPLATES } from './QuickGiftPicker';
import { GiftCardData } from './GiftCelebrationModal';
import { DonationSuccessCard, DonationCardData } from './DonationSuccessCard';
import { useSendToken } from '@/hooks/useSendToken';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { validateMinSendValue } from '@/lib/minSendValidation';
import { useAccount, useBalance, useReadContract, useChainId, useSwitchChain, usePublicClient } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { BSC_MAINNET, BSC_TESTNET, getTokenAddress, getDisabledTokens, getBscScanTxUrlByChain, isTokenAvailableOnChain } from '@/lib/chainTokenMapping';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRecipientSearch } from './gift-dialog/useRecipientSearch';
import { GiftFormStep } from './gift-dialog/GiftFormStep';
import { GiftConfirmStep } from './gift-dialog/GiftConfirmStep';
import type { ResolvedRecipient, MultiSendResult } from './gift-dialog/types';

const ERC20_BALANCE_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
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

interface SenderProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  public_wallet_address: string | null;
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
  isOpen, onClose, mode, presetRecipient, postId, onSuccess,
}: UnifiedGiftSendDialogProps) => {
  // ── Wallet hooks ──
  const { address, isConnected } = useAccount();
  const { activeAddress } = useActiveAccount();
  const effectiveAddress = activeAddress || address;
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { tokens: tokenBalanceList } = useTokenBalances();
  const { sendToken, isPending, txStep, txHash, recheckReceipt, resetState } = useSendToken();
  const publicClient = usePublicClient();
  const { userId: currentUserId } = useCurrentUser();

  // ── Local state ──
  const [estimatedGasPerTx, setEstimatedGasPerTx] = useState(0.0005);
  const defaultToken = SUPPORTED_TOKENS.find(t => t.symbol === 'CAMLY') || SUPPORTED_TOKENS[0];
  const [flowStep, setFlowStep] = useState<FlowStep>('form');
  const [selectedToken, setSelectedToken] = useState<TokenOption>(defaultToken);
  const [amount, setAmount] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<GiftCardData | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [senderProfile, setSenderProfile] = useState<SenderProfile | null>(null);
  const [senderUserId, setSenderUserId] = useState<string | null>(null);
  const [multiSendProgress, setMultiSendProgress] = useState<{ current: number; total: number; results: MultiSendResult[] } | null>(null);
  const [isMultiSending, setIsMultiSending] = useState(false);
  const [currentSendingIndex, setCurrentSendingIndex] = useState(-1);
  
  // ── Network selection ──
  const defaultChainId = (chainId === BSC_TESTNET) ? BSC_TESTNET : BSC_MAINNET;
  const [selectedChainId, setSelectedChainId] = useState(defaultChainId);
  const disabledTokens = useMemo(() => getDisabledTokens(selectedChainId), [selectedChainId]);

  const IS_MAINTENANCE = false;

  // ── Recipient search hook ──
  const isPresetMode = mode === 'post' || ((mode === 'navbar' || mode === 'wallet') && !!presetRecipient?.id);
  const search = useRecipientSearch({ isOpen, isPresetMode, senderUserId });

  // ── Effective recipients ──
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
    return search.resolvedRecipients;
  }, [presetRecipient, search.resolvedRecipients]);

  const recipientsWithWallet = effectiveRecipients.filter(r => !!r.walletAddress);
  const recipientsWithoutWallet = effectiveRecipients.filter(r => !r.walletAddress);
  const hasRecipients = effectiveRecipients.length > 0;
  const isMultiMode = effectiveRecipients.length > 1;

  // ── Balances — use selectedChainId ──
  const resolvedTokenAddress = useMemo(() => {
    if (selectedToken.symbol === 'BNB') return undefined;
    const addr = getTokenAddress(selectedToken.symbol, selectedChainId);
    return addr ? (addr as `0x${string}`) : undefined;
  }, [selectedToken.symbol, selectedChainId]);

  const { data: bnbBalance } = useBalance({ address: effectiveAddress as `0x${string}` | undefined, chainId: selectedChainId });
  const { data: tokenBalance } = useReadContract({
    address: resolvedTokenAddress,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: effectiveAddress ? [effectiveAddress as `0x${string}`] : undefined,
    chainId: selectedChainId,
  });

  const formattedBalance = useMemo(() => {
    if (selectedToken.symbol === 'BNB') return bnbBalance ? parseFloat(bnbBalance.formatted) : 0;
    if (!isTokenAvailableOnChain(selectedToken.symbol, selectedChainId)) return 0;
    if (tokenBalance) return parseFloat(formatUnits(tokenBalance as bigint, selectedToken.decimals));
    return 0;
  }, [selectedToken, bnbBalance, tokenBalance, selectedChainId]);

  const bnbBalanceNum = useMemo(() => bnbBalance ? parseFloat(bnbBalance.formatted) : 0, [bnbBalance]);

  const selectedTokenPrice = useMemo(() => {
    const found = tokenBalanceList.find(t => t.symbol === selectedToken.symbol);
    return found?.price ?? null;
  }, [tokenBalanceList, selectedToken]);

  // ── Derived values ──
  const parsedAmountNum = parseFloat(amount) || 0;
  const totalAmount = parsedAmountNum * recipientsWithWallet.length;
  const minSendCheck = parsedAmountNum > 0
    ? validateMinSendValue(parsedAmountNum, selectedTokenPrice)
    : { valid: false } as { valid: boolean; message?: string };
  const estimatedUsd = parsedAmountNum * (selectedTokenPrice || 0);
  const totalEstimatedUsd = estimatedUsd * recipientsWithWallet.length;
  const isValidAmount = minSendCheck.valid;
  const hasEnoughBalance = formattedBalance >= totalAmount;
  const isWrongNetwork = chainId !== selectedChainId;
  const needsGasWarning = selectedToken.symbol !== 'BNB' && bnbBalanceNum < estimatedGasPerTx * recipientsWithWallet.length && parsedAmountNum > 0;
  const isLargeAmount = totalAmount > formattedBalance * 0.8 && totalAmount > 0;
  const isInProgress = ['signing', 'broadcasted', 'confirming', 'finalizing'].includes(txStep);
  const stepInfo = STEP_CONFIG[txStep] || STEP_CONFIG.idle;
  const canProceedToConfirm = isConnected && recipientsWithWallet.length > 0 && isValidAmount && hasEnoughBalance && !isWrongNetwork;
  const scanUrl = txHash ? getBscScanTxUrlByChain(txHash, selectedChainId) : null;
  const isSendDisabled = !isConnected || recipientsWithWallet.length === 0 || !isValidAmount || !hasEnoughBalance || isPending || isInProgress || isWrongNetwork || isMultiSending;

  // ── Effects ──
  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    (async () => {
      setSenderUserId(currentUserId);
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, wallet_address, public_wallet_address')
        .eq('id', currentUserId)
        .single();
      if (data) setSenderProfile(data as SenderProfile);
    })();
  }, [isOpen, currentUserId, effectiveAddress]);

  useEffect(() => {
    if (!isOpen || !publicClient) return;
    const fetchGasPrice = async () => {
      try {
        const gasPrice = await publicClient.getGasPrice();
        const gasLimit = selectedToken.address ? 65000n : 21000n;
        const totalWei = gasPrice * gasLimit;
        setEstimatedGasPerTx(Number(totalWei) / 1e18 * 1.2);
      } catch { setEstimatedGasPerTx(0.0005); }
    };
    fetchGasPrice();
    const interval = setInterval(fetchGasPrice, 30000);
    return () => clearInterval(interval);
  }, [isOpen, publicClient, selectedToken.address]);

  useEffect(() => {
    if (isOpen) {
      setAmount(''); setSelectedTemplate(null); setCustomMessage('');
      setSelectedToken(defaultToken); setShowCelebration(false); setCelebrationData(null);
      setMultiSendProgress(null); setIsMultiSending(false); setFlowStep('form');
      search.resetSearch(); resetState();
    }
  }, [isOpen]);

  // ── Handlers ──
  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    if (template.id !== 'custom') setCustomMessage(template.message);
    else setCustomMessage('');
  };

  const handleMaxAmount = () => {
    if (formattedBalance > 0 && recipientsWithWallet.length > 0) {
      const perPerson = selectedToken.symbol === 'BNB'
        ? Math.max(0, (formattedBalance - estimatedGasPerTx * recipientsWithWallet.length) / recipientsWithWallet.length)
        : formattedBalance / recipientsWithWallet.length;
      setAmount(perPerson.toString());
    }
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success('Đã copy địa chỉ ví');
  };

  const handleEmojiSelect = (emoji: string) => setCustomMessage(prev => prev + emoji);

  // ── Donation recording ──
  const invalidateDonationCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['donation-history'] }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['transaction-history'] }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['reward-stats'] }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications'] }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['admin-donation-history'] }).catch(() => {});
    window.dispatchEvent(new Event('invalidate-feed'));
    window.dispatchEvent(new Event('invalidate-donations'));
  }, []);

  const recordDonationWithRetry = useCallback(async (hash: string, recipient: ResolvedRecipient, session: { user: { id: string } }): Promise<boolean> => {
    const body = {
      sender_id: session.user.id, recipient_id: recipient.id, amount,
      token_symbol: selectedToken.symbol, token_address: selectedToken.address,
      chain_id: chainId || 56, tx_hash: hash, message: customMessage,
      message_template: selectedTemplate?.id, post_id: postId,
      card_theme: 'celebration', card_sound: 'rich-1',
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data: donationData, error } = await supabase.functions.invoke('record-donation', { body });
        if (!error && donationData?.donation?.id) {
          logger.debug(`[GIFT] record-donation OK (attempt ${attempt + 1}):`, donationData.donation.id);
          localStorage.removeItem(`pending_donation_${hash}`);
          return true;
        }
        throw new Error(error?.message || 'Record failed');
      } catch (err: unknown) {
        logger.error(`[GIFT] record-donation attempt ${attempt + 1} failed:`, (err as Error)?.message);
        if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
      }
    }
    localStorage.setItem(`pending_donation_${hash}`, JSON.stringify({
      txHash: hash, recipientId: recipient.id, senderId: session.user.id,
      amount, tokenSymbol: selectedToken.symbol, message: customMessage, timestamp: Date.now(),
    }));
    return false;
  }, [amount, chainId, customMessage, postId, selectedTemplate?.id, selectedToken]);

  const recordDonationBackground = useCallback(async (hash: string, recipient: ResolvedRecipient) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const ok = await recordDonationWithRetry(hash, recipient, session);
      if (ok) invalidateDonationCache();
    } catch (err) { logger.error('[GIFT] recordDonationBackground error:', err); }
  }, [recordDonationWithRetry, invalidateDonationCache]);

  const recordMultiDonationsSequential = useCallback(async (successResults: MultiSendResult[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let recorded = 0;
      for (const result of successResults) {
        if (result.txHash) { const ok = await recordDonationWithRetry(result.txHash, result.recipient, session); if (ok) recorded++; }
      }
      logger.debug(`[GIFT] Recorded ${recorded}/${successResults.length} donations`);
      if (recorded > 0) invalidateDonationCache();
      if (recorded < successResults.length) toast.warning(`${successResults.length - recorded} giao dịch chưa ghi nhận được. Admin sẽ xử lý sau.`, { duration: 10000 });
    } catch (err) { logger.error('[GIFT] recordMultiDonationsSequential error:', err); }
  }, [recordDonationWithRetry, invalidateDonationCache]);

  // ── Send logic ──
  const walletToken = {
    symbol: selectedToken.symbol, name: selectedToken.name,
    address: selectedToken.address as `0x${string}` | null,
    decimals: selectedToken.decimals, logo: selectedToken.logo, color: selectedToken.color,
  };

  const handleSend = async () => {
    if (recipientsWithWallet.length === 1) {
      // Single send
      const recipient = recipientsWithWallet[0];
      if (!recipient?.walletAddress) { toast.error('Người nhận chưa có ví liên kết'); return; }
      const hash = await sendToken({ token: walletToken, recipient: recipient.walletAddress, amount });
      if (hash) {
        const cardData = buildCardData(hash, recipient, parsedAmountNum);
        setCelebrationData(cardData); setShowCelebration(true); setFlowStep('celebration');
        if (recipient.id) recordDonationBackground(hash, recipient);
        onSuccess?.();
      }
    } else {
      // Multi send
      setIsMultiSending(true); setCurrentSendingIndex(-1);
      const results: MultiSendResult[] = [];
      setMultiSendProgress({ current: 0, total: recipientsWithWallet.length, results: [] });
      for (let i = 0; i < recipientsWithWallet.length; i++) {
        const recipient = recipientsWithWallet[i];
        setCurrentSendingIndex(i);
        setMultiSendProgress(prev => prev ? { ...prev, current: i + 1 } : prev);
        if (i > 0) await new Promise(r => setTimeout(r, 500));
        try {
          const hash = await sendToken({ token: walletToken, recipient: recipient.walletAddress!, amount });
          results.push(hash ? { recipient, success: true, txHash: hash } : { recipient, success: false, error: 'Giao dịch bị từ chối' });
          resetState();
        } catch (err: unknown) {
          results.push({ recipient, success: false, error: (err as Error)?.message || 'Lỗi gửi' });
          resetState();
        }
        setMultiSendProgress(prev => prev ? { ...prev, results: [...results] } : prev);
      }
      setCurrentSendingIndex(-1); setIsMultiSending(false);
      const successResults = results.filter(r => r.success);
      if (successResults.length > 0) {
        const cardData = buildMultiCardData(successResults, results, parsedAmountNum);
        setCelebrationData(cardData); setShowCelebration(true); setFlowStep('celebration'); onSuccess?.();
        if (results.some(r => !r.success)) {
          toast.warning(`Không gửi được cho: ${results.filter(r => !r.success).map(r => `@${r.recipient.username}`).join(', ')}`, { duration: 8000 });
        }
        recordMultiDonationsSequential(successResults);
      } else {
        toast.error('Không gửi được cho bất kỳ người nhận nào');
      }
    }
  };

  const buildCardData = (hash: string, recipient: ResolvedRecipient, parsedAmount: number): GiftCardData => ({
    id: crypto.randomUUID(), amount, tokenSymbol: selectedToken.symbol,
    senderUsername: senderProfile?.username || 'Unknown',
    senderDisplayName: senderProfile?.display_name || senderProfile?.username || 'Unknown',
    senderAvatarUrl: senderProfile?.avatar_url, senderId: senderUserId || undefined,
    senderWalletAddress: effectiveAddress,
    recipientUsername: recipient.username || 'Unknown',
    recipientDisplayName: recipient.displayName || recipient.username || 'Unknown',
    recipientAvatarUrl: recipient.avatarUrl, recipientId: recipient.id,
    recipientWalletAddress: recipient.walletAddress, message: customMessage, txHash: hash,
    lightScoreEarned: Math.floor(parsedAmount / 100), createdAt: new Date().toISOString(),
  });

  const buildMultiCardData = (successResults: MultiSendResult[], allResults: MultiSendResult[], parsedAmount: number): GiftCardData => {
    const first = successResults[0];
    const successNames = successResults.map(r => `@${r.recipient.username}`).join(', ');
    return {
      id: crypto.randomUUID(), amount: (parsedAmount * successResults.length).toString(),
      tokenSymbol: selectedToken.symbol,
      senderUsername: senderProfile?.username || 'Unknown',
      senderDisplayName: senderProfile?.display_name || senderProfile?.username || 'Unknown',
      senderAvatarUrl: senderProfile?.avatar_url, senderId: senderUserId || undefined,
      senderWalletAddress: address,
      recipientUsername: successResults.length === 1 ? first.recipient.username : successNames,
      recipientDisplayName: successResults.length === 1 ? (first.recipient.displayName || first.recipient.username) : `${successResults.length} người nhận`,
      recipientAvatarUrl: successResults.length === 1 ? first.recipient.avatarUrl : null,
      recipientId: first.recipient.id,
      recipientWalletAddress: first.recipient.walletAddress || '',
      message: customMessage, txHash: first.txHash || '',
      lightScoreEarned: Math.floor(parsedAmount * successResults.length / 100),
      createdAt: new Date().toISOString(),
      multiRecipients: allResults.map(r => ({
        username: r.recipient.username, avatarUrl: r.recipient.avatarUrl,
        recipientId: r.recipient.id, walletAddress: r.recipient.walletAddress || '',
        success: r.success, txHash: r.txHash, error: r.error,
      })),
    };
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
      logger.error('[GIFT] Error sending reminder:', error);
      toast.error('Không thể gửi hướng dẫn.');
    } finally { setIsSendingReminder(false); }
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false); setCelebrationData(null); onClose();
  };

  const handleDialogClose = () => {
    if (txStep === 'signing' || isMultiSending) return;
    onClose();
  };

  const dialogTitle = useMemo(() => {
    if (effectiveRecipients.length === 1) return `Trao gửi yêu thương cho @${effectiveRecipients[0].username} 🎁❤️🎉`;
    if (effectiveRecipients.length > 1) return `Trao gửi yêu thương cho ${effectiveRecipients.length} người 🎁❤️🎉`;
    return 'Trao gửi yêu thương 🎁❤️🎉';
  }, [effectiveRecipients]);

  const showMainDialog = isOpen && flowStep !== 'celebration';

  // ── Render ──
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

          {IS_MAINTENANCE && (
            <div className="py-4 space-y-4">
              <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-5 text-center space-y-3">
                <div className="text-4xl">🔧</div>
                <h3 className="font-bold text-destructive text-lg">Hệ thống tạm dừng bảo trì</h3>
                <p className="text-sm text-muted-foreground">Chức năng tặng quà và chuyển tiền đang tạm ngưng để bảo trì hệ thống. Vui lòng quay lại sau.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={handleDialogClose}>Đóng</Button>
            </div>
          )}

          {!IS_MAINTENANCE && (<>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-2">
              {['form', 'confirm'].map((step, idx) => (
                <div key={step} className="flex items-center gap-1 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    flowStep === step ? 'bg-primary text-primary-foreground' :
                    (flowStep === 'confirm' && idx === 0) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>{idx + 1}</div>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{idx === 0 ? 'Thông tin' : 'Xác nhận'}</span>
                  {idx < 1 && <div className="flex-1 h-px bg-border" />}
                </div>
              ))}
            </div>

            {flowStep === 'form' && (
              <GiftFormStep
                senderProfile={senderProfile}
                effectiveAddress={effectiveAddress}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                formattedBalance={formattedBalance}
                amount={amount}
                onAmountChange={setAmount}
                onMaxAmount={handleMaxAmount}
                onSelectQuickAmount={(n) => setAmount(n.toString())}
                isMultiMode={isMultiMode}
                parsedAmountNum={parsedAmountNum}
                totalAmount={totalAmount}
                estimatedUsd={estimatedUsd}
                totalEstimatedUsd={totalEstimatedUsd}
                minSendCheck={minSendCheck}
                hasEnoughBalance={hasEnoughBalance}
                isLargeAmount={isLargeAmount}
                isPresetMode={isPresetMode}
                effectiveRecipients={effectiveRecipients}
                recipientsWithWallet={recipientsWithWallet}
                recipientsWithoutWallet={recipientsWithoutWallet}
                hasRecipients={hasRecipients}
                resolvedRecipients={search.resolvedRecipients}
                searchTab={search.searchTab}
                searchQuery={search.searchQuery}
                searchResults={search.searchResults}
                isSearching={search.isSearching}
                searchError={search.searchError}
                onSearchTabChange={search.handleChangeTab}
                onSearchQueryChange={search.setSearchQuery}
                onSelectRecipient={search.handleSelectRecipient}
                onRemoveRecipient={search.handleRemoveRecipient}
                onClearAllRecipients={search.handleClearAll}
                customMessage={customMessage}
                onMessageChange={setCustomMessage}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={handleSelectTemplate}
                onEmojiSelect={handleEmojiSelect}
                isConnected={isConnected}
                isWrongNetwork={isWrongNetwork}
                needsGasWarning={needsGasWarning}
                bnbBalanceNum={bnbBalanceNum}
                estimatedGasPerTx={estimatedGasPerTx}
                onConnectWallet={() => openConnectModal?.()}
                onSwitchChain={() => switchChain({ chainId: bsc.id })}
                canProceedToConfirm={canProceedToConfirm}
                isInProgress={isInProgress}
                onGoToConfirm={() => canProceedToConfirm && setFlowStep('confirm')}
                onClose={handleDialogClose}
                onSendReminder={handleSendReminder}
                isSendingReminder={isSendingReminder}
                onCopyAddress={handleCopyAddress}
              />
            )}

            {flowStep === 'confirm' && (
              <GiftConfirmStep
                senderProfile={senderProfile}
                address={address}
                selectedToken={selectedToken}
                amount={amount}
                parsedAmountNum={parsedAmountNum}
                totalAmount={totalAmount}
                totalEstimatedUsd={totalEstimatedUsd}
                selectedTokenPrice={selectedTokenPrice}
                isMultiMode={isMultiMode}
                recipientsWithWallet={recipientsWithWallet}
                customMessage={customMessage}
                multiSendProgress={multiSendProgress}
                isMultiSending={isMultiSending}
                currentSendingIndex={currentSendingIndex}
                txStep={txStep}
                stepInfo={stepInfo}
                isInProgress={isInProgress}
                isPending={isPending}
                txHash={txHash}
                scanUrl={scanUrl}
                isSendDisabled={isSendDisabled}
                onSend={handleSend}
                onGoBack={() => !isInProgress && !isMultiSending && setFlowStep('form')}
                onClose={handleDialogClose}
                onRecheckReceipt={recheckReceipt}
                onCopyAddress={handleCopyAddress}
              />
            )}
          </>)}
        </DialogContent>
      </Dialog>

      {celebrationData && (
        <DonationSuccessCard
          isOpen={showCelebration}
          onClose={handleCloseCelebration}
          data={{
            id: celebrationData.id, amount: celebrationData.amount,
            tokenSymbol: celebrationData.tokenSymbol,
            senderUsername: celebrationData.senderUsername,
            senderDisplayName: celebrationData.senderDisplayName || celebrationData.senderUsername,
            senderAvatarUrl: celebrationData.senderAvatarUrl,
            senderId: celebrationData.senderId,
            recipientUsername: celebrationData.recipientUsername,
            recipientDisplayName: celebrationData.recipientDisplayName || celebrationData.recipientUsername,
            recipientAvatarUrl: celebrationData.recipientAvatarUrl,
            recipientId: celebrationData.recipientId,
            message: celebrationData.message, txHash: celebrationData.txHash,
            lightScoreEarned: celebrationData.lightScoreEarned,
            createdAt: celebrationData.createdAt,
          } as DonationCardData}
        />
      )}
    </>
  );
};
