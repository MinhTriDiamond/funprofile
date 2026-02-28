

# Fix Smart Portrait Fit for Single Video Posts

## Root Cause

The Smart Portrait Fit feature **only activates in square mode** (`displayMode="square"`), but single video posts in `MediaGrid.tsx` use `displayMode="rectangle"` (line 74). This means portrait videos posted alone never get the blurred backdrop treatment.

The code at `FeedVideoPlayer.tsx` line 92:
```typescript
const showBackdrop = isSquare && resolvedObjectFit === 'contain';
```
`isSquare` is `false` for single videos → backdrop never shows.

Additionally, there's no way to confirm if `onVideoMetadata` is even firing because there are no debug logs.

## Fix

### File 1: `src/components/feed/FeedVideoPlayer.tsx`
- Add `console.log` in `handleVideoMetadata` to confirm metadata detection is working
- Change `showBackdrop` to also activate in rectangle mode when video is portrait: `showBackdrop = resolvedObjectFit === 'contain' && isPortrait === true`
- For rectangle mode with portrait video, use `aspect-[9/16]` container with `max-h-[70vh]` instead of unconstrained height, so the blurred backdrop has a defined area

### File 2: `src/components/feed/MediaGrid.tsx`
- For single video posts, pass `fitStrategy="smart"` so the smart detection activates (currently no fitStrategy is passed, so it defaults to `'smart'`, which is fine)
- No change needed here actually since the fix is in FeedVideoPlayer

### Summary of logic change:
```typescript
// Before:
const showBackdrop = isSquare && resolvedObjectFit === 'contain';

// After: 
const showBackdrop = resolvedObjectFit === 'contain' && isPortrait === true;
```

And for rectangle portrait video wrapper, add constrained height so backdrop is visible:
```typescript
const wrapperStyle = !isSquare && isPortrait
  ? { aspectRatio: '9/16', maxHeight: '70vh' }
  : !isSquare && arNum
  ? { aspectRatio: `${arNum}`, maxHeight: '70vh' }
  : ...
```

