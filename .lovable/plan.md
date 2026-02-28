

# Fix: ChunkedVideoPlayer Stuck After ~2 Minutes

## Root Cause

In the MSE (MediaSource Extensions) path of `ChunkedVideoPlayer.tsx`, there is a **deadlock bug** in the ordered-append queue:

1. `processQueue()` removes chunk data from `pendingData` map **before** calling `appendBuffer()`
2. If `appendBuffer()` throws an error, `nextAppendSeq` is **not incremented** — but the chunk data is already gone from `pendingData`
3. The chunk is already in the `fetched` set, so it won't be re-fetched
4. Result: `processQueue()` loops forever looking for `pendingData.get(nextAppendSeq)` which will never exist again → **playback permanently stuck**

This explains why only ~2 minutes plays: the first SourceBuffer error (visible in console) causes the queue to deadlock.

## Fix: `src/modules/live/components/ChunkedVideoPlayer.tsx`

### Change 1: Skip failed chunks instead of deadlocking
In `processQueue()`, when `appendBuffer` throws a non-quota error:
- Increment `nextAppendSeq` to skip the corrupted chunk
- Continue processing the queue so playback can proceed

### Change 2: Handle async SourceBuffer `error` event
The `error` event listener currently only counts errors. It should also:
- Set `appending = false` (the updateend may not fire after error)
- Increment `nextAppendSeq` to skip the stuck chunk
- Call `processQueue()` to continue

### Change 3: Clear `fetched` on seek for re-fetchability
When user seeks, chunks near the new position may need re-fetching. Currently `fetched` prevents this. On `seeked`, reset `nextAppendSeq` to the target chunk index and allow re-fetching of chunks around the seek target.

### Summary of key logic changes:

```typescript
// processQueue - skip failed chunk
} else {
  sbErrorCount++;
  nextAppendSeq++; // ← ADD: skip this chunk so queue doesn't deadlock
  processQueue();  // ← ADD: continue with next chunk
  ...
}

// SourceBuffer error event - unstick queue
sourceBuffer.addEventListener('error', () => {
  sbErrorCount++;
  appending = false;        // ← ADD
  nextAppendSeq++;          // ← ADD: skip stuck chunk
  processQueue();           // ← ADD: continue
  ...
});
```

