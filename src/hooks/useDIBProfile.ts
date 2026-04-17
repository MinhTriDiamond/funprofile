import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useDIBProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dib-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: did } = await (supabase as any)
        .from('did_registry')
        .select('did_id')
        .eq('owner_user_id', user!.id)
        .maybeSingle();
      if (!did?.did_id) return null;
      const { data, error } = await (supabase as any)
        .from('dib_profile')
        .select('*')
        .eq('did_id', did.did_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}
