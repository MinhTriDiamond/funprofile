/**
 * SR-2: Gift Dialog — useDonationFlow hook
 *
 * Extracts all business logic (send, record, cache invalidation) from
 * the massive UnifiedGiftSendDialog component into a dedicated hook.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import type { ResolvedRecipient, MultiSendResult } from './types';
import type { TokenOption } from '@/components/donations/TokenSelector';
import type { MessageTemplate } from '@/components/donations/QuickGiftPicker';
import type { GiftCardData } from '@/components/donations/GiftCelebrationModal';

interface UseDonationFlowParams {
  selectedToken: TokenOption;
  amount: string;
  customMessage: string;
  selectedTemplate: MessageTemplate | null;
  postId?: string;
  chainId: number | undefined;
  sendToken: (params: { token: { symbol: string; name: string; address: `0x${string}` | null; decimals: number; logo: string; color: string }; recipient: string; amount: string }) => Promise<string | undefined>;
  resetState: () => void;
  senderProfile: { username: string; display_name: string | null; avatar_url: string | null; wallet_address: string | null; public_wallet_address: string | null } | null;
  senderUserId: string | null;
  effectiveAddress: string | undefined;
  address: string | undefined;
}

export function useDonationFlow(params: UseDonationFlowParams) {
  const {
    selectedToken,
    amount,
    customMessage,
    selectedTemplate,
    postId,
    chainId,
    sendToken,
    resetState,
    senderProfile,
    senderUserId,
    effectiveAddress,
    address,
  } = params;

  const walletToken = {
    symbol: selectedToken.symbol,
    name: selectedToken.name,
    address: selectedToken.address as `0x${string}` | null,
    decimals: selectedToken.decimals,
    logo: selectedToken.logo,
    color: selectedToken.color,
  };

  const invalidateDonationCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['donation-history'] });
    queryClient.invalidateQueries({ queryKey: ['transaction-history'] });
    queryClient.invalidateQueries({ queryKey: ['reward-stats'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }, []);

  const recordDonationWithRetry = useCallback(async (
    hash: string,
    recipient: ResolvedRecipient,
    session: { user: { id: string } }
  ): Promise<boolean> => {
    const body = {
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
      card_theme: 'celebration',
      card_sound: 'rich-1',
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data: donationData, error } = await supabase.functions.invoke('record-donation', { body });
        if (!error && donationData?.donation?.id) {
          console.log(`[GIFT] record-donation OK (attempt ${attempt + 1}):`, donationData.donation.id);
          localStorage.removeItem(`pending_donation_${hash}`);
          return true;
        }
        throw new Error(error?.message || 'Record failed');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'unknown';
        console.error(`[GIFT] record-donation attempt ${attempt + 1} failed:`, msg);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Both attempts failed — save to localStorage for recovery
    localStorage.setItem(`pending_donation_${hash}`, JSON.stringify({
      txHash: hash,
      recipientId: recipient.id,
      senderId: session.user.id,
      amount,
      tokenSymbol: selectedToken.symbol,
      message: customMessage,
      timestamp: Date.now(),
    }));
    return false;
  }, [amount, chainId, customMessage, postId, selectedTemplate?.id, selectedToken]);

  const recordDonationBackground = useCallback(async (hash: string, recipient: ResolvedRecipient) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const ok = await recordDonationWithRetry(hash, recipient, session);
      if (ok) invalidateDonationCache();
    } catch (err) {
      console.error('[GIFT] recordDonationBackground error:', err);
    }
  }, [recordDonationWithRetry, invalidateDonationCache]);

  const recordMultiDonationsSequential = useCallback(async (successResults: MultiSendResult[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let recorded = 0;
      for (const result of successResults) {
        if (result.txHash) {
          const ok = await recordDonationWithRetry(result.txHash, result.recipient, session);
          if (ok) recorded++;
        }
      }

      console.log(`[GIFT] Recorded ${recorded}/${successResults.length} donations`);
      if (recorded > 0) invalidateDonationCache();
      if (recorded < successResults.length) {
        toast.warning(
          `${successResults.length - recorded} giao dịch chưa ghi nhận được. Admin sẽ xử lý sau.`,
          { duration: 10000 }
        );
      }
    } catch (err) {
      console.error('[GIFT] recordMultiDonationsSequential error:', err);
    }
  }, [recordDonationWithRetry, invalidateDonationCache]);

  const buildGiftCard = useCallback((
    hash: string,
    recipient: ResolvedRecipient,
    parsedAmount: number
  ): GiftCardData => ({
    id: crypto.randomUUID(),
    amount,
    tokenSymbol: selectedToken.symbol,
    senderUsername: senderProfile?.username || 'Unknown',
    senderDisplayName: senderProfile?.display_name || senderProfile?.username || 'Unknown',
    senderAvatarUrl: senderProfile?.avatar_url,
    senderId: senderUserId || undefined,
    senderWalletAddress: effectiveAddress,
    recipientUsername: recipient.username || 'Unknown',
    recipientDisplayName: recipient.displayName || recipient.username || 'Unknown',
    recipientAvatarUrl: recipient.avatarUrl,
    recipientId: recipient.id,
    recipientWalletAddress: recipient.walletAddress,
    message: customMessage,
    txHash: hash,
    lightScoreEarned: Math.floor(parsedAmount / 100),
    createdAt: new Date().toISOString(),
  }), [amount, customMessage, effectiveAddress, selectedToken.symbol, senderProfile, senderUserId]);

  const sendSingle = useCallback(async (
    recipient: ResolvedRecipient
  ): Promise<{ hash: string; cardData: GiftCardData } | null> => {
    if (!recipient?.walletAddress) {
      toast.error('Người nhận chưa có ví liên kết');
      return null;
    }
    const hash = await sendToken({ token: walletToken, recipient: recipient.walletAddress, amount });
    if (!hash) return null;

    const cardData = buildGiftCard(hash, recipient, parseFloat(amount) || 0);
    recordDonationBackground(hash, recipient);
    return { hash, cardData };
  }, [sendToken, walletToken, amount, buildGiftCard, recordDonationBackground]);

  const sendMulti = useCallback(async (
    recipients: ResolvedRecipient[],
    parsedAmountNum: number,
    onProgress: (progress: { current: number; total: number; results: MultiSendResult[] }) => void
  ): Promise<{ cardData: GiftCardData; results: MultiSendResult[] } | null> => {
    const results: MultiSendResult[] = [];
    onProgress({ current: 0, total: recipients.length, results: [] });

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      onProgress({ current: i + 1, total: recipients.length, results: [...results] });

      if (i > 0) await new Promise((r) => setTimeout(r, 500));

      try {
        const hash = await sendToken({ token: walletToken, recipient: recipient.walletAddress!, amount });
        if (hash) {
          results.push({ recipient, success: true, txHash: hash });
          resetState();
        } else {
          results.push({ recipient, success: false, error: 'Giao dịch bị từ chối' });
          resetState();
        }
      } catch (err: unknown) {
        results.push({ recipient, success: false, error: (err as Error)?.message || 'Lỗi gửi' });
        resetState();
      }

      onProgress({ current: i + 1, total: recipients.length, results: [...results] });
    }

    const successResults = results.filter((r) => r.success);
    if (successResults.length === 0) {
      toast.error('Không gửi được cho bất kỳ người nhận nào');
      return null;
    }

    const firstSuccess = successResults[0];
    const successNames = successResults.map((r) => `@${r.recipient.username}`).join(', ');
    const cardData: GiftCardData = {
      id: crypto.randomUUID(),
      amount: (parsedAmountNum * successResults.length).toString(),
      tokenSymbol: selectedToken.symbol,
      senderUsername: senderProfile?.username || 'Unknown',
      senderDisplayName: senderProfile?.display_name || senderProfile?.username || 'Unknown',
      senderAvatarUrl: senderProfile?.avatar_url,
      senderId: senderUserId || undefined,
      senderWalletAddress: address,
      recipientUsername: successResults.length === 1
        ? firstSuccess.recipient.username
        : successNames,
      recipientDisplayName: successResults.length === 1
        ? firstSuccess.recipient.displayName || firstSuccess.recipient.username
        : `${successResults.length} người nhận`,
      recipientAvatarUrl: successResults.length === 1 ? firstSuccess.recipient.avatarUrl : null,
      recipientId: firstSuccess.recipient.id,
      recipientWalletAddress: firstSuccess.recipient.walletAddress || '',
      message: customMessage,
      txHash: firstSuccess.txHash || '',
      lightScoreEarned: Math.floor(parsedAmountNum * successResults.length / 100),
      createdAt: new Date().toISOString(),
      multiRecipients: results.map((r) => ({
        username: r.recipient.username,
        avatarUrl: r.recipient.avatarUrl,
        recipientId: r.recipient.id,
        walletAddress: r.recipient.walletAddress || '',
        success: r.success,
        txHash: r.txHash,
        error: r.error,
      })),
    };

    if (results.some((r) => !r.success)) {
      const failedNames = results.filter((r) => !r.success).map((r) => `@${r.recipient.username}`).join(', ');
      toast.warning(`Không gửi được cho: ${failedNames}`, { duration: 8000 });
    }

    recordMultiDonationsSequential(successResults);
    return { cardData, results };
  }, [
    sendToken, walletToken, amount, resetState, selectedToken.symbol,
    senderProfile, senderUserId, address, customMessage,
    recordMultiDonationsSequential,
  ]);

  return { sendSingle, sendMulti, invalidateDonationCache };
}
