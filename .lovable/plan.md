

# Optimize ChunkedVideoPlayer — Production-Safe

## Overview

Rewrite the MSE loading logic in `ChunkedVideoPlayer.tsx` with adaptive windowed buffering, LRU chunk cache with byte cap, seek prioritization, and improved buffering UX. No changes to other files.

## Changes: `src/modules/live/components/ChunkedVideoPlayer.tsx`

### Constants

Replace current constants with:
- `BUFFER_AHEAD_S = 60` (adaptive: reduced to 30 on slow networks)
- `BUFFER_BEHIND_S = 15`
- `PREFETCH_CONCURRENCY = 5`
- `PREFETCH_HORIZON_S = 180` (background prefetch up to 3 min ahead)
- `MAX_CACHE_BYTES = 80MB` desktop / `30MB` mobile (detect via `navigator.maxTouchPoints`)
- `BUFFERING_DEBOUNCE_MS = 300`
- Remove `POLL_INTERVAL_MS = 1000` (replace with smarter polling)

### New: LRU Chunk Cache

Add a class/object `ChunkCache` inside the component closure:
- `Map<number, ArrayBuffer>` for data storage
- `totalBytes` tracker
- `accessOrder: number[]` (LRU queue)
- `set(seq, data)`: add chunk, evict oldest if `totalBytes > MAX_CACHE_BYTES`
- `get(seq)`: return data and bump in LRU order
- `has(seq)`: check existence
- `evictFarthest(currentSeq)`: remove chunks farthest from current playback position first

### Adaptive Buffer Ahead

Add network speed estimation:
- Measure download time of first 2-3 chunks
- Calculate `bytesPerSecond`
- If `bytesPerSecond < 500KB/s` → use `BUFFER_AHEAD_S = 30`, else `60`
- Store as mutable ref variable, re-estimate periodically

### Fetch Logic Changes

Replace `ensureBuffered()` with two-tier approach:

1. **`ensureAppendWindow()`**: Fetches chunks from `nextAppendSeq` to `currentTime + bufferAheadS`. These are immediately appended to SourceBuffer. Concurrency-limited to `PREFETCH_CONCURRENCY`.

2. **`backgroundPrefetch()`**: Runs on a slower interval (2s). Fetches chunks from end of append window up to `currentTime + PREFETCH_HORIZON_S`, storing in LRU cache only (not appending). Stops when `MAX_CACHE_BYTES` reached.

### Seek Priority

On `seeked` event:
1. Calculate target chunk index from `video.currentTime`
2. Cancel/deprioritize background prefetch (set a `seekGeneration` counter; background tasks check and bail if stale)
3. Check if target chunk ±2 are in cache → if yes, append immediately (no spinner)
4. If not cached, fetch target chunk + neighbors with highest priority
5. Resume background prefetch after seek chunks are appended

### Buffering Indicator Improvements

New state variables:
- `loadProgress: number` (0-1, tracks fetched chunks for append window / total chunks)
- `bufferingDebounced: boolean` (actual display state)

Logic:
- `waiting` event → start 300ms timer, only set `bufferingDebounced = true` if still waiting after timeout
- `canplay`, `playing`, `timeupdate`, `seeked` → clear timer, set `bufferingDebounced = false`
- Initial load: show thin progress bar (`<Progress>`) showing `fetchedCount / totalChunks` percentage
- Full-screen spinner only on `bufferingDebounced === true` (actual stall)

### Error Handling

- `loadChunk` already has `fetchWithRetry` (3 retries with backoff) — keep as-is
- After all retries fail: log `seq`, URL, status code
- Add `failedChunks: Set<number>` — if a chunk permanently fails:
  - Skip it in append queue (increment `nextAppendSeq`)
  - If >3 chunks fail total → show error with "Retry" button that calls `start()` again
  - Never spin forever — either play with gaps or show actionable error

### Render Changes

Replace the loading/buffering overlay:

```text
Before:  single overlay with Loader2 for both loading AND buffering

After:
  - Initial load (loading=true): thin progress bar at top + small centered spinner
  - Buffering stall (bufferingDebounced=true): semi-transparent overlay with spinner
  - Error state: error message + "Thử lại" (Retry) button
```

### Cleanup

- Clear LRU cache on unmount
- Clear all timers, abort all in-flight fetches via AbortController
- Cancel background prefetch on destroy

## Files Changed

Only `src/modules/live/components/ChunkedVideoPlayer.tsx` — full rewrite of the MSE loading logic within the same component structure.

