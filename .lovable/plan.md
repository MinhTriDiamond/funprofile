

# Facebook-style Comment GIF & Sticker — Implementation Plan

## 1. CommentItem.tsx — Restructure media rendering

**Current**: GIF/Sticker rendered inside `bg-muted` bubble (lines 147-189).

**Change**: Split rendering into 3 parts:

- **Username-only header** (shown when content is empty + media is gif/sticker): Display username without bubble
- **Text bubble** (lines 147-189): Conditionally render — hide entirely when `!comment.content.trim() && (mediaType === 'gif' || mediaType === 'sticker')`; for text+gif/sticker combos, render text in bubble but move media outside
- **Standalone media** (new, after bubble): GIF with `max-w-[280px] rounded-2xl shadow-sm`, Sticker with `w-32 h-32 object-contain hover:scale-105 transition-transform`
- Regular image/video stays inside bubble as before

Lines affected: 146-189 (restructure the `flex-1 min-w-0` div content)

## 2. CommentReplyForm.tsx — Dark mode fix

**Line 130**: Add `dark:bg-secondary dark:text-white` to textarea className.

## 3. StickerPicker.tsx — Haptic feedback

**Line 78**: Change button className to add `active:scale-95 hover:bg-primary/5` (replace `hover:bg-secondary`).

## 4. GifPicker.tsx — Natural aspect ratio

**Line 75**: Change `aspect-square` to `aspect-video` on GIF buttons.

## Files changed
- `src/components/feed/CommentItem.tsx` (restructure media outside bubble)
- `src/components/feed/CommentReplyForm.tsx` (1 line dark mode fix)
- `src/components/feed/StickerPicker.tsx` (1 line hover effect)
- `src/components/feed/GifPicker.tsx` (1 line aspect ratio)

No database changes needed. Backward compatible — old comments with `g:`/`s:` prefixes parse identically.

