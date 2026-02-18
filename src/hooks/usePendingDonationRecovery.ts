import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PENDING_PREFIX = 'pending_donation_';
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

interface PendingDonationPayload {
  txHash: string;
  recipientId: string;
  amount: string;
  tokenSymbol: string;
  tokenAddress?: string;
  chainId?: number;
  message?: string;
  cardTheme?: string;
  cardSound?: string;
  timestamp: number;
}

/**
 * Hook chạy khi user đăng nhập để tự động retry các pending donations
 * bị gián đoạn (network error, browser đóng trước khi record-donation hoàn tất).
 */
export function usePendingDonationRecovery() {
  const hasRun = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Chỉ chạy 1 lần khi user đăng nhập thành công
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user && !hasRun.current) {
        hasRun.current = true;
        await recoverPendingDonations(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}

async function recoverPendingDonations(accessToken: string) {
  const pendingKeys: string[] = [];
  
  // Quét tất cả localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PENDING_PREFIX)) {
      pendingKeys.push(key);
    }
  }

  if (pendingKeys.length === 0) return;

  console.log(`[DonationRecovery] Found ${pendingKeys.length} pending donations to retry`);

  const now = Date.now();
  
  for (const key of pendingKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.removeItem(key);
        continue;
      }

      const payload: PendingDonationPayload = JSON.parse(raw);

      // Bỏ qua nếu quá 7 ngày (tránh retry vô hạn)
      if (now - payload.timestamp > MAX_AGE_MS) {
        console.log(`[DonationRecovery] Removing stale pending donation: ${payload.txHash}`);
        localStorage.removeItem(key);
        continue;
      }

      // Thử gọi record-donation
      const { error } = await supabase.functions.invoke('record-donation', {
        body: {
          txHash: payload.txHash,
          recipientId: payload.recipientId,
          amount: payload.amount,
          tokenSymbol: payload.tokenSymbol,
          tokenAddress: payload.tokenAddress,
          chainId: payload.chainId || 56,
          message: payload.message,
          cardTheme: payload.cardTheme || 'celebration',
          cardSound: payload.cardSound || 'rich-1',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!error) {
        console.log(`[DonationRecovery] Successfully recovered donation: ${payload.txHash}`);
        localStorage.removeItem(key);
      } else {
        console.warn(`[DonationRecovery] Failed to recover donation ${payload.txHash}:`, error);
        // Giữ lại để lần sau thử lại
      }
    } catch (err) {
      console.error(`[DonationRecovery] Error processing key ${key}:`, err);
    }
  }
}
