

# Fix Smart Portrait Fit - Root Cause Found

## Bug

In `FacebookVideoPlayer.tsx` line 189, the `useEffect` dependency array is:
```typescript
[resolvedSrc, onPlay, onPause, onEnded, onError]
```

**`onVideoMetadata` is missing from the dependency array.** The `onLoadedMeta` handler captures a stale closure where `onVideoMetadata` is the initial value. Since `loadedmetadata` fires only once (when the video source loads), it uses the stale callback and the metadata never reaches `FeedVideoPlayer`.

Additionally, `onPlayStart` is also missing from deps but that's a separate issue.

There's also a secondary timing problem: `loadedmetadata` may fire **before** the effect re-runs with the correct callback. To handle this, we should also check `v.videoWidth` immediately when the effect runs (not just on event).

## Fix

### File: `src/components/ui/FacebookVideoPlayer.tsx`

1. Add `onVideoMetadata` and `onPlayStart` to the useEffect dependency array at line 189
2. Inside the effect, immediately check if metadata is already available (`v.videoWidth > 0`) and call `onVideoMetadata` right away (handles case where `loadedmetadata` already fired)

Change line 163-169 + 189:
```typescript
const onLoadedMeta = () => {
  if (v.duration && isFinite(v.duration)) setDuration(v.duration);
  setLoading(false);
  if (v.videoWidth && v.videoHeight) {
    onVideoMetadata?.({ width: v.videoWidth, height: v.videoHeight });
  }
};

// Immediately check if metadata already loaded
if (v.videoWidth && v.videoHeight) {
  onVideoMetadata?.({ width: v.videoWidth, height: v.videoHeight });
}
```

Dependency array:
```typescript
}, [resolvedSrc, onPlay, onPlayStart, onPause, onEnded, onError, onVideoMetadata]);
```

No other files need changes.

