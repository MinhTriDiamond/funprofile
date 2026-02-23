import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 15_000; // 15 seconds

/**
 * Sends a heartbeat every 15s to keep the live session marked as active.
 * Ghost sessions (no heartbeat > 60s) can be cleaned up by a scheduled job.
 */
export function useLiveHeartbeat(sessionId: string | undefined, isHost: boolean) {
  useEffect(() => {
    if (!sessionId || !isHost) return;

    const db = supabase as any;

    const interval = setInterval(async () => {
      await db
        .from('live_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('status', 'live');
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [sessionId, isHost]);
}
