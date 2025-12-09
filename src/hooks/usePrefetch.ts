import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

/**
 * Hook for prefetching data on hover/focus for faster navigation
 */
export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchProfile = useCallback(async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['profile', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient]);

  const prefetchUserPosts = useCallback(async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['posts', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('posts')
          .select('*, profiles(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        return data;
      },
      staleTime: 3 * 60 * 1000, // 3 minutes
    });
  }, [queryClient]);

  const prefetchFeed = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ['feed'],
      queryFn: async () => {
        const { data } = await supabase
          .from('posts')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false })
          .limit(20);
        return data;
      },
      staleTime: 3 * 60 * 1000, // 3 minutes
    });
  }, [queryClient]);

  const prefetchLeaderboard = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ['leaderboard'],
      queryFn: async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .limit(50);
        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient]);

  return {
    prefetchProfile,
    prefetchUserPosts,
    prefetchFeed,
    prefetchLeaderboard,
  };
};

export default usePrefetch;
