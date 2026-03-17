import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

const PENDING_PREFIX = 'pending_donation_';
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

interface PendingDonationPayload {
  txHash: string;
  recipientId: string;
  senderId?: string;
  amount: string;
  tokenSymbol: string;
  tokenAddress?: string;
  chainId?: number;
  message?: string;
  messageTemplate?: string;
  postId?: string;
  cardTheme?: string;
  cardSound?: string;
  timestamp: number;
}

/**
 * Hook chạy khi user đăng nhập để tự động retry các pending donations
 * bị gián đoạn (network error, browser đóng trước khi record-donation hoàn tất).
 * 
 * QUAN TRỌNG: Pending donations chỉ được lưu vào localStorage SAU KHI
 * blockchain đã confirm giao dịch thành công. Hook này chỉ retry việc
 * ghi nhận vào database, KHÔNG retry giao dịch blockchain.
 */
export function usePendingDonationRecovery() {
  const hasRun = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user && !hasRun.current) {
        hasRun.current = true;
        await recoverPendingDonations(session.user.id, session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}

async function recoverPendingDonations(userId: string, accessToken: string) {
  const pendingKeys: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PENDING_PREFIX)) {
      pendingKeys.push(key);
    }
  }

  if (pendingKeys.length === 0) return;

  logger.info(`[DonationRecovery] Found ${pendingKeys.length} pending donations to retry`);

  const now = Date.now();
  
  for (const key of pendingKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.removeItem(key);
        continue;
      }

      const payload: PendingDonationPayload = JSON.parse(raw);

      // Bỏ qua nếu quá 7 ngày
      if (now - payload.timestamp > MAX_AGE_MS) {
        logger.info(`[DonationRecovery] Removing stale pending donation: ${payload.txHash}`);
        localStorage.removeItem(key);
        continue;
      }

      // Gọi record-donation với đúng field names theo edge function interface
      const { error } = await supabase.functions.invoke('record-donation', {
        body: {
          sender_id: payload.senderId || userId,
          recipient_id: payload.recipientId,
          amount: payload.amount,
          token_symbol: payload.tokenSymbol,
          token_address: payload.tokenAddress || null,
          chain_id: payload.chainId || 56,
          tx_hash: payload.txHash,
          message: payload.message,
          message_template: payload.messageTemplate,
          post_id: payload.postId,
          card_theme: payload.cardTheme || 'celebration',
          card_sound: payload.cardSound || 'rich-1',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!error) {
        logger.info(`[DonationRecovery] Successfully recovered donation: ${payload.txHash}`);
        localStorage.removeItem(key);
      } else {
        // 409 = duplicate — giao dịch đã được ghi nhận rồi
        if (error.message?.includes('409') || error.message?.includes('already recorded')) {
          logger.info(`[DonationRecovery] Donation already exists: ${payload.txHash}`);
          localStorage.removeItem(key);
        } else {
          console.warn(`[DonationRecovery] Failed to recover donation ${payload.txHash}:`, error);
        }
      }
    } catch (err) {
      console.error(`[DonationRecovery] Error processing key ${key}:`, err);
    }
  }
}
