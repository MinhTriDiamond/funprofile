import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useDID(userId?: string) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;

  return useQuery({
    queryKey: ['did', targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('did_registry')
        .select('*')
        .eq('owner_user_id', targetId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}
