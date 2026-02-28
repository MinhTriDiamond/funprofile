

# Fix: Portrait video in 1:1 square container (Facebook style)

Currently portrait videos in rectangle mode use `aspectRatio: '16/9'` for the wrapper. The user wants a **1:1 square** container instead, matching Facebook's style.

## File: `src/components/feed/FeedVideoPlayer.tsx`

1. **Line 107**: Change `aspectRatio: '16/9'` to `aspectRatio: '1/1'` so the wrapper is a square container
2. The inner video remains `aspect-[9/16]` and centered via flexbox, creating the portrait-in-square effect with blurred/black sides

Single line change: `{ maxHeight: '70vh', aspectRatio: '16/9' }` → `{ maxHeight: '70vh', aspectRatio: '1/1' }`

