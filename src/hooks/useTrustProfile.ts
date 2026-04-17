import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTrustProfile(didId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trust-profile', didId, user?.id],
    enabled: !!(didId || user?.id),
    queryFn: async () => {
      let resolvedDid = didId;
      if (!resolvedDid && user?.id) {
        const { data: did } = await (supabase as any)
          .from('did_registry')
          .select('did_id')
          .eq('owner_user_id', user.id)
          .maybeSingle();
        resolvedDid = did?.did_id;
      }
      if (!resolvedDid) return null;
      const { data, error } = await (supabase as any)
        .from('trust_profile')
        .select('*')
        .eq('did_id', resolvedDid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}
