/**
 * SR-4: useRealtimeTable — Centralized Supabase realtime pattern
 *
 * Problem solved: Each hook (useMintHistory, usePendingActions, useConversations,
 * NotificationDropdown) duplicates the same channel setup/cleanup/isMounted logic.
 *
 * Solution: Generic utility hook that handles:
 * - Channel creation with unique name
 * - isMounted guard to prevent setState after unmount
 * - Proper cleanup on unmount
 * - Optional enable flag (similar to React Query's `enabled`)
 * - Visibility-aware: pauses callback when tab is hidden
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeTableConfig<T = Record<string, unknown>> {
  /** Unique channel name — include userId to scope correctly */
  channelName: string;
  /** Table to subscribe to */
  table: string;
  /** Schema (default: 'public') */
  schema?: string;
  /** Optional row-level filter e.g. 'user_id=eq.xxx' */
  filter?: string;
  /** Events to listen for */
  events?: RealtimeEvent[];
  /** Called when INSERT happens */
  onInsert?: (payload: T) => void;
  /** Called when UPDATE happens */
  onUpdate?: (payload: T) => void;
  /** Called when DELETE happens */
  onDelete?: (payload: T) => void;
  /** Called for any matching event (INSERT | UPDATE | DELETE) */
  onChange?: (event: RealtimeEvent, payload: T) => void;
  /** When false, channel is not created (default: true) */
  enabled?: boolean;
}

export function useRealtimeTable<T = Record<string, unknown>>(config: RealtimeTableConfig<T>) {
  const {
    channelName,
    table,
    schema = 'public',
    filter,
    events = ['INSERT', 'UPDATE'],
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
  } = config;

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  // Stable callback refs — avoid re-subscribing when callbacks change identity
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onInsertRef.current = onInsert; }, [onInsert]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) return;

    // Cleanup any previous channel with same name
    cleanup();

    let channel = supabase.channel(channelName);

    // Register listeners for each requested event
    const eventsToListen = events.length > 0 ? events : ['INSERT', 'UPDATE', 'DELETE'] as RealtimeEvent[];

    for (const event of eventsToListen) {
      if (event === '*') {
        // Subscribe to all events
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema, table, ...(filter ? { filter } : {}) },
          (payload) => {
            if (!isMountedRef.current) return;
            // Skip updates when tab is hidden to save resources
            if (document.visibilityState === 'hidden') return;
            const p = payload.new as T || payload.old as T;
            const ev = payload.eventType as RealtimeEvent;
            if (ev === 'INSERT' && onInsertRef.current) onInsertRef.current(p);
            if (ev === 'UPDATE' && onUpdateRef.current) onUpdateRef.current(p);
            if (ev === 'DELETE' && onDeleteRef.current) onDeleteRef.current(p);
            onChangeRef.current?.(ev, p);
          }
        );
      } else {
        const pgEvent = event as 'INSERT' | 'UPDATE' | 'DELETE';
        channel = channel.on(
          'postgres_changes',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { event: pgEvent, schema, table, ...(filter ? { filter } : {}) } as any,
          (payload: any) => {
            if (!isMountedRef.current) return;
            if (document.visibilityState === 'hidden') return;
            const p = (pgEvent === 'DELETE' ? payload.old : payload.new) as T;
            if (pgEvent === 'INSERT' && onInsertRef.current) onInsertRef.current(p);
            if (pgEvent === 'UPDATE' && onUpdateRef.current) onUpdateRef.current(p);
            if (pgEvent === 'DELETE' && onDeleteRef.current) onDeleteRef.current(p);
            onChangeRef.current?.(pgEvent, p);
          }
        );
      }
    }

    channel.subscribe((status) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useRealtimeTable] ${channelName} → ${status}`);
      }
    });

    channelRef.current = channel;

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, schema, filter, enabled, events.join(',')]);

  return { cleanup };
}
