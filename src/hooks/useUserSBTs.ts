import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserSBTs(didId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-sbts', didId, user?.id],
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
      if (!resolvedDid) return [];
      const { data, error } = await (supabase as any)
        .from('sbt_registry')
        .select('*')
        .eq('did_id', resolvedDid)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
