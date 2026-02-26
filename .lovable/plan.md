

# Fix Sticker Picker -- 2 files

## Root Cause
CDN `nicedoc/fluent-emoji` returns 404 for all sticker images. Microsoft's official `fluentui-emoji` repo has inconsistent folder naming (skin-tone variants use `(default)` suffix, etc.) making it unreliable to map ~85 emojis.

## Solution
Use **Twemoji CDN** (already integrated and working in the project via `getTwemojiUrl`) as the sticker image source. Twemoji SVGs render at any size, are reliable, and consistent with the rest of the app.

## Changes

### File 1: `src/data/curatedStickers.ts`
- Replace `FLUENT_BASE` CDN with Twemoji CDN
- Add helper function `twemojiUrl(emoji: string)` that converts emoji char to Twemoji SVG URL (reusing the same `toCodePoint` logic)
- Update all ~85 sticker entries: `url` becomes `twemojiUrl(alt)` -- the `alt` field already contains the correct emoji character
- This guarantees every URL works since it's the same CDN used by `TwemojiImage`

### File 2: `src/components/feed/StickerPicker.tsx`
- Import `TwemojiImage` and use it for category tab icons (size 20) instead of raw `{cat.icon}`
- Add image loading state with `bg-muted/50 animate-pulse` placeholder
- Add `onError` fallback: if sticker image fails, show the emoji `alt` text as large centered text
- Make grid responsive: `grid-cols-4 sm:grid-cols-5` for mobile/desktop
- Wrap sticker images in a container with rounded corners and subtle shadow for premium look

### URL Pattern
```
Before: https://raw.githubusercontent.com/nicedoc/fluent-emoji/main/pngs/128/grinning-face.png (404)
After:  https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f600.svg (works)
```

