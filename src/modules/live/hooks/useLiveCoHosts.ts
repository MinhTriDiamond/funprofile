import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CoHost {
  id: string;
  userId: string;
  username: string;
  avatar_url: string;
  status: 'pending' | 'accepted' | 'declined' | 'left';
}

const MAX_CO_HOSTS = 3;

export function useLiveCoHosts(sessionId: string | undefined) {
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);

  const fetchCoHosts = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('live_co_hosts')
      .select('id, user_id, status, profiles:user_id(username, avatar_url)')
      .eq('session_id', sessionId)
      .in('status', ['pending', 'accepted']) as any;

    if (data) {
      setCoHosts(
        data.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          username: r.profiles?.username || 'User',
          avatar_url: r.profiles?.avatar_url || '',
          status: r.status,
        }))
      );
    }
  }, [sessionId]);

  useEffect(() => {
    fetchCoHosts();
  }, [fetchCoHosts]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`co-hosts-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_co_hosts',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        fetchCoHosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchCoHosts]);

  const activeCoHosts = coHosts.filter((c) => c.status === 'accepted');
  const pendingInvites = coHosts.filter((c) => c.status === 'pending');
  const canInviteMore = activeCoHosts.length < MAX_CO_HOSTS;

  const inviteUser = useCallback(async (userId: string, currentUserId: string, liveTitle?: string) => {
    if (!sessionId) return;
    if (!canInviteMore && !pendingInvites.some((p) => p.userId === userId)) {
      toast.error('Đã đạt tối đa 3 người cùng live');
      return;
    }
    // Check if already invited
    if (coHosts.some((c) => c.userId === userId)) {
      toast.info('Đã gửi lời mời trước đó');
      return;
    }

    const { error } = await supabase.from('live_co_hosts').insert({
      session_id: sessionId,
      user_id: userId,
      invited_by: currentUserId,
      status: 'pending',
    } as any);

    if (error) {
      toast.error('Không thể gửi lời mời');
      return;
    }

    // Also send notification
    await supabase.from('notifications').insert({
      type: 'live_invite',
      user_id: userId,
      actor_id: currentUserId,
      metadata: { session_id: sessionId, live_title: liveTitle || 'Live Stream' },
    });

    toast.success('Đã gửi lời mời live cùng');
  }, [sessionId, canInviteMore, coHosts, pendingInvites]);

  return { coHosts, activeCoHosts, pendingInvites, canInviteMore, inviteUser };
}
