

# Fix Smart Portrait Fit - Root Cause Analysis

## Problems Found

### Problem 1: `querySelector` approach is unreliable
`FeedVideoPlayer` uses `document.querySelector('[data-feed-video-id="..."] video')` to detect orientation. This fails because:
- Multiple videos in the same post share the same `feedId` as `coordId`, so querySelector finds the wrong element
- The video element may not exist during retry window
- Cleanup may remove listener before metadata fires

### Problem 2: Rectangle mode clips portrait videos
For single videos (`displayMode="rectangle"`), the wrapper has `overflow-hidden` + `maxHeight: '70vh'` but NO explicit height. `h-full` on child elements doesn't resolve, so the video renders at its natural height. For portrait videos, this exceeds 70vh and gets clipped by `overflow-hidden`.

### Problem 3: Default to `cover` when `isPortrait` is null
When orientation is unknown (`isPortrait === null`), the smart strategy defaults to `cover` (line 125). If detection fails entirely, portrait video stays cropped forever.

## Solution

Move orientation detection INTO `FacebookVideoPlayer` and use a callback to report dimensions back. This eliminates the querySelector approach entirely.

### File 1: `src/components/ui/FacebookVideoPlayer.tsx`
- Add prop `onVideoMetadata?: (meta: { width: number; height: number }) => void`
- In the existing `loadedmetadata` event handler (line 161), call `onVideoMetadata` with `v.videoWidth` and `v.videoHeight`

### File 2: `src/components/feed/FeedVideoPlayer.tsx`
- Remove all `document.querySelector` logic (lines 59-98) for metadata detection
- Add `handleMetadata` callback that receives `{ width, height }` from FacebookVideoPlayer and sets `isPortrait`
- Pass `onVideoMetadata={handleMetadata}` to FacebookVideoPlayer
- For rectangle mode: replace `overflow-hidden` with `overflow-visible` or remove it, and ensure wrapper height is properly constrained via CSS (use `max-h-[70vh]` on the video container itself rather than relying on `overflow-hidden` to clip)
- Change default when `isPortrait === null`: use `'contain'` as safe default (shows full video) instead of `'cover'` (crops)

