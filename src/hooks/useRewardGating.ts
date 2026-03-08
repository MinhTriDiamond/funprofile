/**
 * useRewardGating — Hook quản lý quyền accrual vs extraction cho wallet-first accounts
 * 
 * Mô hình B: accrual luôn được phép, extraction bị khóa cho tới khi verify email.
 * 
 * Product decision: wallet-first users tích lũy reward nội bộ nhưng không thể
 * claim/mint/withdraw cho tới khi liên kết + xác thực email thật.
 */

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';

interface RewardGatingData {
  reward_locked: boolean | null;
  signup_method: string | null;
  account_status: string | null;
}

export interface RewardGatingResult {
  /** Luôn true — cho phép tích lũy nội bộ */
  canAccrueRewards: boolean;
  /** Cho phép claim/mint/withdraw — false nếu reward_locked hoặc account limited */
  canExtractRewards: boolean;
  /** Account được tạo bằng wallet-first flow */
  isWalletFirstAccount: boolean;
  /** Account đang ở trạng thái giới hạn */
  isLimitedAccount: boolean;
  /** Lý do bị khóa extraction */
  rewardLockedReason: 'email_not_verified' | null;
  isLoading: boolean;
}

export function useRewardGating(): RewardGatingResult {
  const { userId, isLoading: userLoading } = useCurrentUser();

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ['reward-gating', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('reward_locked, signup_method, account_status')
        .eq('id', userId!)
        .single();
      return data as RewardGatingData | null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const rewardLocked = data?.reward_locked ?? false;
  const signupMethod = data?.signup_method ?? 'email';
  const accountStatus = data?.account_status ?? 'active';

  return {
    canAccrueRewards: true,
    canExtractRewards: !rewardLocked && accountStatus === 'active',
    isWalletFirstAccount: signupMethod === 'wallet',
    isLimitedAccount: accountStatus === 'limited',
    rewardLockedReason: rewardLocked ? 'email_not_verified' : null,
    isLoading: userLoading || queryLoading,
  };
}
