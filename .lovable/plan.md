

# Center Portrait Video with Blurred/Black Side Panels

## Problem
Portrait videos are left-aligned in the post container. The `aspect-ratio: 9/16` wrapper is narrower than the full post width, leaving empty space on the right side.

## Fix: `src/components/feed/FeedVideoPlayer.tsx`

**Approach**: For rectangle mode with portrait video, use a full-width wrapper with black background and center the 9/16 video inside it. The blurred backdrop fills the full width behind.

1. Change wrapper to always be full-width with `bg-black` background
2. Remove `aspectRatio: '9/16'` from wrapper style (keep `maxHeight: '70vh'`) — instead apply the 9/16 constraint to the inner foreground video container
3. Add `flex items-center justify-center` to the wrapper to center the video
4. The blurred backdrop layer already covers `absolute inset-0` so it fills the full width naturally
5. The foreground video div gets constrained to `aspect-[9/16] h-full` so it sits centered within the full-width black/blurred container

**Result**: Full-width container with blurred poster behind + centered portrait video on top — similar to how Facebook/Instagram display portrait videos.

