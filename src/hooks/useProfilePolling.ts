import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PolledPostStats {
  likeCount: number;
  commentCount: number;
  reactionCounts: { type: string; count: number }[];
}

const POLL_INTERVAL = 30_000; // 30 seconds

/**
 * Batch-polls stats for visible posts on the Profile page.
 * Replaces per-post Realtime channels with 2 queries every 30s.
 */
export function useProfilePolling(postIds: string[]) {
  const [statsMap, setStatsMap] = useState<Record<string, PolledPostStats>>({});
  const visibleIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Stable stringified key to avoid re-running effect on every render
  const postIdsKey = useMemo(() => postIds.join(','), [postIds]);

  const fetchBatchStats = useCallback(async () => {
    const ids = Array.from(visibleIdsRef.current);
    if (ids.length === 0) return;

    try {
      const [reactionsRes, commentsRes] = await Promise.all([
        supabase
          .from('reactions')
          .select('post_id, id, user_id, type')
          .in('post_id', ids)
          .is('comment_id', null),
        supabase
          .from('comments')
          .select('post_id')
          .in('post_id', ids),
      ]);

      const newMap: Record<string, PolledPostStats> = {};

      // Process reactions
      const reactionsByPost = new Map<string, { id: string; user_id: string; type: string }[]>();
      (reactionsRes.data || []).forEach((r) => {
        const list = reactionsByPost.get(r.post_id) || [];
        list.push(r);
        reactionsByPost.set(r.post_id, list);
      });

      // Process comment counts
      const commentCountByPost = new Map<string, number>();
      (commentsRes.data || []).forEach((c) => {
        commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) || 0) + 1);
      });

      for (const id of ids) {
        const reactions = reactionsByPost.get(id) || [];
        const counts: Record<string, number> = {};
        reactions.forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });

        newMap[id] = {
          likeCount: reactions.length,
          commentCount: commentCountByPost.get(id) || 0,
          reactionCounts: Object.entries(counts).map(([type, count]) => ({ type, count })),
        };
      }

      setStatsMap((prev) => ({ ...prev, ...newMap }));
    } catch (err) {
      console.error('useProfilePolling fetch error:', err);
    }
  }, []);

  // Track which post IDs exist
  useEffect(() => {
    visibleIdsRef.current = new Set(postIds);
  }, [postIdsKey]);

  // Set up polling interval
  useEffect(() => {
    if (postIds.length === 0) return;

    // Initial fetch after a short delay (let initialStats render first)
    const initialTimer = setTimeout(fetchBatchStats, 5_000);

    timerRef.current = setInterval(fetchBatchStats, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(timerRef.current);
    };
  }, [postIdsKey, fetchBatchStats]);

  return statsMap;
}
