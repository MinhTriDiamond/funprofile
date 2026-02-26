import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'fun_search_history_v1';
const ENABLED_KEY = 'fun_search_history_enabled';
const MAX_ITEMS = 30;

export interface SearchHistoryItem {
  id: string;
  query: string;
  type: 'text' | 'user' | 'post';
  metadata?: {
    userId?: string;
    username?: string;
    avatarUrl?: string | null;
    [key: string]: any;
  };
  useCount: number;
  lastUsedAt: string;
  createdAt: string;
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isHistoryEnabled(): boolean {
  try {
    const val = localStorage.getItem(ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setHistoryEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, String(enabled));
  } catch { }
}

export function getHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: SearchHistoryItem[] = JSON.parse(raw);
    return items.sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
  } catch {
    return [];
  }
}

function saveHistory(items: SearchHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { }
}

export function addToHistory(
  query: string,
  type: SearchHistoryItem['type'] = 'text',
  metadata?: SearchHistoryItem['metadata']
): SearchHistoryItem {
  const items = getHistory();
  const now = new Date().toISOString();
  const existingIdx = items.findIndex(
    (i) => i.query.toLowerCase() === query.toLowerCase() && i.type === type
  );

  let item: SearchHistoryItem;

  if (existingIdx >= 0) {
    item = items[existingIdx];
    item.useCount += 1;
    item.lastUsedAt = now;
    if (metadata) item.metadata = { ...item.metadata, ...metadata };
    items.splice(existingIdx, 1);
    items.unshift(item);
  } else {
    item = { id: generateId(), query, type, metadata, useCount: 1, lastUsedAt: now, createdAt: now };
    items.unshift(item);
  }

  // Trim to max
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
  saveHistory(items);
  return item;
}

export function removeFromHistory(id: string): void {
  const items = getHistory().filter((i) => i.id !== id);
  saveHistory(items);
}

export function clearHistory(): void {
  saveHistory([]);
}

export function getFilteredHistory(prefix: string, limit = 10): SearchHistoryItem[] {
  const lower = prefix.toLowerCase();
  return getHistory()
    .filter((i) => i.query.toLowerCase().startsWith(lower))
    .slice(0, limit);
}

// ---- Cloud sync ----

export async function syncToCloud(item: SearchHistoryItem): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await (supabase as any).from('search_history').upsert(
      {
        user_id: session.user.id,
        query: item.query,
        type: item.type,
        metadata: item.metadata ?? {},
        use_count: item.useCount,
        last_used_at: item.lastUsedAt,
      },
      { onConflict: 'user_id,query,type' }
    );
  } catch { }
}

export async function syncFromCloud(): Promise<SearchHistoryItem[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return getHistory();

    const { data } = await (supabase as any)
      .from('search_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('last_used_at', { ascending: false })
      .limit(20);

    if (!data || data.length === 0) return getHistory();

    const local = getHistory();
    const merged = [...local];

    for (const cloud of data) {
      const key = `${cloud.query.toLowerCase()}::${cloud.type}`;
      const localIdx = merged.findIndex(
        (i) => `${i.query.toLowerCase()}::${i.type}` === key
      );
      if (localIdx >= 0) {
        // Keep whichever is more recent
        const localItem = merged[localIdx];
        if (new Date(cloud.last_used_at) > new Date(localItem.lastUsedAt)) {
          localItem.lastUsedAt = cloud.last_used_at;
          localItem.useCount = Math.max(localItem.useCount, cloud.use_count);
          if (cloud.metadata) localItem.metadata = { ...localItem.metadata, ...cloud.metadata };
        }
      } else {
        merged.push({
          id: cloud.id,
          query: cloud.query,
          type: cloud.type,
          metadata: cloud.metadata,
          useCount: cloud.use_count,
          lastUsedAt: cloud.last_used_at,
          createdAt: cloud.created_at,
        });
      }
    }

    merged.sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
    if (merged.length > MAX_ITEMS) merged.length = MAX_ITEMS;
    saveHistory(merged);
    return merged;
  } catch {
    return getHistory();
  }
}

export async function clearCloudHistory(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await (supabase as any).from('search_history').delete().eq('user_id', session.user.id);
  } catch { }
}

export async function removeCloudItem(query: string, type: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await (supabase as any)
      .from('search_history')
      .delete()
      .eq('user_id', session.user.id)
      .eq('query', query)
      .eq('type', type);
  } catch { }
}
