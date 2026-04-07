import { useEffect, useRef, useCallback } from 'react';

const DRAFT_KEY = 'draft_post';
const DEBOUNCE_MS = 500;

export interface PostDraftData {
  content: string;
  privacy: string;
  feeling: any | null;
  location: string | null;
  taggedFriends: any[];
  savedAt: number;
}

function readDraft(): PostDraftData | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PostDraftData;
  } catch {
    return null;
  }
}

function writeDraft(data: Omit<PostDraftData, 'savedAt'>) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch { /* quota exceeded — silently ignore */ }
}

export function clearPostDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
}

export function getPostDraft(): PostDraftData | null {
  return readDraft();
}

export function hasDraft(): boolean {
  return readDraft() !== null;
}

/**
 * Auto-saves post draft to sessionStorage with debounce.
 * Call clearPostDraft() after successful submit.
 */
export function usePostDraftAutoSave(data: Omit<PostDraftData, 'savedAt'>, isReady = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Skip auto-save until restore is done (prevents race condition clearing draft on mount)
    if (!isReady) return;

    const hasContent = data.content.trim().length > 0
      || data.feeling !== null
      || data.location !== null
      || data.taggedFriends.length > 0;

    if (!hasContent) {
      clearPostDraft();
      return;
    }

    timerRef.current = setTimeout(() => {
      writeDraft(data);
    }, DEBOUNCE_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data.content, data.privacy, data.feeling, data.location, data.taggedFriends, isReady]);
}
