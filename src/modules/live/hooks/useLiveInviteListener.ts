import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PendingCoHostInvite {
  id: string;
  sessionId: string;
  hostUsername: string;
  hostAvatar: string;
}

export function useLiveInviteListener(sessionId: string | undefined) {
  const [pendingInvite, setPendingInvite] = useState<PendingCoHostInvite | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  useEffect(() => {
    if (!sessionId || !currentUserId) return;

    // Check existing pending invite
    const checkExisting = async () => {
      const { data } = await supabase
        .from('live_co_hosts')
        .select('id, session_id, invited_by, profiles:invited_by(username, avatar_url)')
        .eq('session_id', sessionId)
        .eq('user_id', currentUserId)
        .eq('status', 'pending')
        .maybeSingle() as any;

      if (data) {
        setPendingInvite({
          id: data.id,
          sessionId: data.session_id,
          hostUsername: data.profiles?.username || 'Host',
          hostAvatar: data.profiles?.avatar_url || '',
        });
      }
    };
    checkExisting();

    const channel = supabase
      .channel(`co-host-invite-${sessionId}-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_co_hosts',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload: any) => {
        if (payload.new.user_id === currentUserId && payload.new.status === 'pending') {
          // Fetch host profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.invited_by)
            .single();

          setPendingInvite({
            id: payload.new.id,
            sessionId: payload.new.session_id,
            hostUsername: profile?.username || 'Host',
            hostAvatar: profile?.avatar_url || '',
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, currentUserId]);

  const acceptInvite = useCallback(async () => {
    if (!pendingInvite) return;
    await supabase
      .from('live_co_hosts')
      .update({ status: 'accepted', joined_at: new Date().toISOString() } as any)
      .eq('id', pendingInvite.id);
    setPendingInvite(null);
  }, [pendingInvite]);

  const declineInvite = useCallback(async () => {
    if (!pendingInvite) return;
    await supabase
      .from('live_co_hosts')
      .update({ status: 'declined' } as any)
      .eq('id', pendingInvite.id);
    setPendingInvite(null);
  }, [pendingInvite]);

  return { pendingInvite, acceptInvite, declineInvite };
}
