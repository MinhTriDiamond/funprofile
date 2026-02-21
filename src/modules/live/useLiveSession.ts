import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getLiveSession, listActiveLiveSessions } from './liveService';

export function useLiveSession(sessionId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['live-session', sessionId],
    queryFn: () => getLiveSession(sessionId as string),
    enabled: !!sessionId,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`live-session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions', filter: `id=eq.${sessionId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] });
          queryClient.invalidateQueries({ queryKey: ['live-active-sessions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  return query;
}

export function useActiveLiveSessions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['live-active-sessions'],
    queryFn: listActiveLiveSessions,
    staleTime: 10_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('live-active-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['live-active-sessions'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
