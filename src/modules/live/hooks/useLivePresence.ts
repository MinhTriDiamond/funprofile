import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LiveViewer {
  userId: string;
  username: string;
  avatar_url: string;
}

export function useLivePresence(sessionId: string | undefined) {
  const [viewers, setViewers] = useState<LiveViewer[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      const channel = supabase.channel(`live-presence:${sessionId}`, {
        config: { presence: { key: user.id } },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<LiveViewer>();
          const list: LiveViewer[] = [];
          const seen = new Set<string>();
          for (const key of Object.keys(state)) {
            const entries = state[key];
            if (entries && entries.length > 0) {
              const v = entries[0];
              if (!seen.has(v.userId)) {
                seen.add(v.userId);
                list.push({ userId: v.userId, username: v.username, avatar_url: v.avatar_url });
              }
            }
          }
          setViewers(list);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              userId: user.id,
              username: profile?.username || 'User',
              avatar_url: profile?.avatar_url || '',
            });
          }
        });

      channelRef.current = channel;
    };

    setup();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId]);

  return { viewers };
}
