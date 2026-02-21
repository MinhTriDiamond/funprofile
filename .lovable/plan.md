
# Fix Live Video Replay: Playback + Delete + UI Improvement

## Problems Found

### Problem 1: Video Play Button Blocked by Overlay
In `LazyVideo.tsx`, the placeholder overlay (`absolute inset-0`) sits ON TOP of the video element. The `showPlaceholder` state only clears when `onLoadedData` fires, but for `.webm` files with `preload="metadata"`, this event may not fire reliably on all browsers. Even when it does, there's a race condition where the placeholder blocks the native video controls (play button) from receiving clicks.

### Problem 2: Storage Video Not Cleaned Up on Delete
`handleDelete` in `FacebookPostCard.tsx` only calls `extractPostStreamVideos()` which checks for Cloudflare Stream URLs (`videodelivery.net`). Live recordings stored in Supabase Storage (`supabase.co/storage/v1/...`) are never detected, so the video file remains in storage even after the post is deleted -- wasting space.

### Problem 3: No Visual "LIVE Replay" Indicator
The live replay post looks identical to a regular video post. Users have no visual cue that this was a live broadcast replay.

---

## Implementation Plan

### Step 1: Fix LazyVideo Playback (`src/components/ui/LazyVideo.tsx`)

Three changes to ensure video controls are always clickable:

1. Add `onLoadedMetadata` handler as a backup to clear the placeholder (fires before `onLoadedData` and is more reliable for metadata-only preload)
2. Add `pointer-events-none` to the placeholder overlay so it never blocks clicks on the video controls underneath
3. Set a timeout fallback: if placeholder hasn't cleared after 3 seconds of being in view, force-remove it

### Step 2: Fix Delete for Storage Videos (`src/components/feed/FacebookPostCard.tsx`)

Update `handleDelete` to also detect and clean up Supabase Storage video files:

1. Check if `video_url` contains `supabase.co/storage` 
2. If so, extract the storage path and call `supabase.storage.from('live-recordings').remove([path])`
3. This ensures the video file is deleted from storage when the post is deleted

### Step 3: Add "LIVE Replay" Badge (`src/components/feed/FacebookPostCard.tsx`)

Add a small "LIVE Replay" badge overlay on live replay video posts:

1. Check if `post.post_type === 'live'` 
2. If so, render a small red badge with a play icon and "LIVE" text at the top-left corner of the video
3. This gives users a clear visual indicator

### Step 4: Improve Video UI for Live Replays

For live replay posts specifically:
- Show video duration if available from metadata
- Ensure the video always shows native controls prominently
- Add a larger centered play button overlay for better tap targets on mobile

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/ui/LazyVideo.tsx` | Fix placeholder blocking controls; add `onLoadedMetadata`; timeout fallback |
| `src/components/feed/FacebookPostCard.tsx` | Delete storage videos on post delete; add LIVE badge |
| `src/utils/streamHelpers.ts` | Add `isSupabaseStorageUrl()` and `deleteStorageVideo()` helpers |
