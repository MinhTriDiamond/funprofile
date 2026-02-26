

# Fix GIF & Sticker trong Comment — 3 files

## File 1: `src/data/curatedGifs.ts`
- Find & replace all `https://media.giphy.com` → `https://i.giphy.com` (lines 14-81, ~50 URLs)

## File 2: `src/components/feed/CommentReplyForm.tsx`
- Add `onGifSelect` and `onStickerSelect` callbacks to `<CommentMediaUpload>` (line 161-170), matching the pattern from `CommentSection.tsx`:
  - Strip `g:`/`s:` prefix is NOT needed — store the full prefixed URL as `mediaUrl` and set `mediaType = 'image'`
  - Add `setTimeout` + `scrollIntoView` for auto-scroll to preview
- Update media preview (line 142-156): detect `g:` and `s:` prefixes, strip them for the `src` attribute display
- Add `data-media-preview` attribute to the preview container for scrollIntoView targeting

## File 3: `src/components/feed/GifPicker.tsx`
- Create `GifImage` sub-component with:
  - `loaded` / `error` state tracking
  - `animate-pulse` placeholder while loading
  - Error fallback showing "GIF" text
  - `object-cover` for consistent grid display
- Replace raw `<img>` in the grid with `<GifImage>`

## Why this fixes the bug
- **CommentReplyForm** currently passes NO `onGifSelect`/`onStickerSelect` → clicking GIF/Sticker in reply form calls `onGifSelect?.(...)` which is undefined → nothing happens
- **GIF URLs** use `media.giphy.com` which returns HTML redirects, not direct GIF files → images fail to load
- **GifPicker** shows blank squares when images fail because there's no error handling

