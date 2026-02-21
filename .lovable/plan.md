
# Fix Live Video Replay Not Showing on Feed

## Root Cause

The recording **is saved correctly** to the Supabase Storage bucket (`live-recordings`). The post's `video_url` is properly set. The problem is a **rendering bug** in the video player component.

### Why it appears as a grey box

`LazyVideo.tsx` has a deadlock condition:

1. Video uses `preload="none"` -- browser loads zero bytes
2. The `<video>` element starts with `opacity: 0` (invisible)
3. Opacity changes to `1` only when `onLoadedData` fires
4. `onLoadedData` never fires because `preload="none"` prevents any loading
5. Result: grey placeholder stays forever, video is invisible behind it

### Missing thumbnail

The live post's `metadata.thumbnail_url` exists in the database but `FacebookPostCard` doesn't pass it to the video player as a poster image.

---

## Fix Plan

### Step 1: Fix LazyVideo deadlock (`src/components/ui/LazyVideo.tsx`)

Change `preload="none"` to `preload="metadata"` when no poster is available. This lets the browser load just enough data (first frame + duration) to trigger `onLoadedData`, breaking the deadlock.

```
preload={effectivePoster ? "none" : "metadata"}
```

This is safe -- `preload="metadata"` only downloads a few KB (video headers), not the full file.

### Step 2: Pass thumbnail as poster for live posts (`src/components/feed/FacebookPostCard.tsx`)

Extract `metadata.thumbnail_url` from live posts and pass it through to `MediaGrid` -> `LazyVideo` as a poster image. This provides an immediate visual before the video loads.

Changes:
- Update `MediaItem` interface in `MediaGrid.tsx` to support an optional `poster` field
- In `FacebookPostCard.tsx`, when building `mediaItems`, if `post.video_url` exists and `post.metadata?.thumbnail_url` exists, include it as `poster`
- In `MediaGrid.tsx`, pass `poster` to `LazyVideo`

### Step 3: Clean up old failed live posts (optional)

The 4 older live sessions have `recording_status: failed` and `video_url: null`. These show as empty grey posts on the feed. No code change needed -- they just show text content "Dang LIVE tren FUN Profile" without media, which is correct behavior for failed recordings.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/ui/LazyVideo.tsx` | Change `preload` from `"none"` to `"metadata"` when no poster |
| `src/components/feed/MediaGrid.tsx` | Add optional `poster` to `MediaItem`, pass to `LazyVideo` |
| `src/components/feed/FacebookPostCard.tsx` | Extract `metadata.thumbnail_url` and attach as `poster` to video media items |
