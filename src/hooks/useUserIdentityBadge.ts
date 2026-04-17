import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Lấy DID + Trust Tier badge cho bất kỳ user_id nào (public).
 * Dùng để hiển thị badge trên ProfileHeader, PostFooter, etc.
 */
export interface UserIdentityBadgeData {
  did_id?: string;
  did_level?: string;
  did_status?: string;
  trust_tier?: string;
  tc?: number;
  sybil_risk?: string;
}

export function useUserIdentityBadge(userId?: string | null) {
  return useQuery<UserIdentityBadgeData | null>({
    queryKey: ['user-identity-badge', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return null;

      const { data: did } = await (supabase as any)
        .from('did_registry')
        .select('did_id, did_level, status')
        .eq('owner_user_id', userId)
        .maybeSingle();

      if (!did?.did_id) return null;

      const { data: trust } = await (supabase as any)
        .from('trust_profile')
        .select('trust_tier, tc, sybil_risk')
        .eq('did_id', did.did_id)
        .maybeSingle();

      return {
        did_id: did.did_id,
        did_level: did.did_level,
        did_status: did.status,
        trust_tier: trust?.trust_tier,
        tc: trust?.tc != null ? Number(trust.tc) : undefined,
        sybil_risk: trust?.sybil_risk,
      };
    },
  });
}
