

# Responsive Review — Comment System (4 files)

## 1. Nested Depth (CommentItem.tsx) — PASSED

- Line 130: `level >= 2 ? 'ml-4 sm:ml-8' : 'ml-4 sm:ml-10'` — correct.
- Level 0: no margin. Level 1: `ml-4 sm:ml-10`. Level 2+: `ml-4 sm:ml-8` (capped).
- On 320px screen, level 3 reply gets: 16px (ml-4) + 12px (pl-3) + 12px (gap-3) + 36px (avatar) = ~76px left offset. Remaining content width: ~244px — sufficient, no content crushed.
- `min-w-0` on line 146 ensures flex child shrinks properly.

## 2. Horizontal Scroll (overflow-hidden + break-words) — PASSED with 1 minor issue

- CommentSection line 216: `overflow-hidden` — applied.
- CommentItem line 147: bubble has `overflow-hidden` — applied.
- CommentItem line 157: `break-words overflow-hidden` on `<p>` tag — applied.
- CommentReplyForm line 112: `overflow-hidden` on form — applied.

**Minor issue found**: `break-words` is not a valid Tailwind class. The correct class is `break-words` which maps to `overflow-wrap: break-word`. Actually in Tailwind, `break-words` IS valid (`overflow-wrap: break-word`). However, for strings with zero spaces (like long URLs or wallet addresses), `break-all` (`word-break: break-all`) would be more aggressive. Current `break-words` should handle most cases since `overflow-hidden` is the safety net.

**Verdict**: Acceptable. Long URLs will break at word boundaries, and `overflow-hidden` clips anything that still overflows.

## 3. Action Bar (flex-wrap) — PASSED

- CommentSection line 267: `flex items-center justify-between flex-wrap gap-2` — applied.
- CommentReplyForm line 159: `flex items-center justify-between flex-wrap gap-2` — applied.
- Send button uses `justify-between` which pushes it to the right. When wrapped, it drops to a new line but remains visible and accessible.

## 4. Media Scaling — PASSED

- CommentItem lines 163, 177, 184: all use `max-w-full sm:max-w-[280px]` — applied.
- Sticker (line 171): `w-24 h-24 object-contain` — fixed size, fits any screen.
- On 320px screen: images scale to container width (minus margins) — no cropping.

## 5. Picker (GIF/Sticker) — PASSED

- CommentMediaUpload lines 117, 132: `fixed bottom-4 left-2 right-2 z-50 max-w-[calc(100vw-32px)]` — applied.
- On mobile: picker is centered with 8px margin on each side (left-2 right-2 = 8px each). `max-w-[calc(100vw-32px)]` ensures it never exceeds viewport minus 32px total padding.
- On desktop: `sm:absolute sm:w-80 sm:max-w-none` — reverts to 320px positioned picker.

## Conclusion: SYSTEM PASSED

| Check | Status |
|-------|--------|
| Nested Depth (level cap) | PASSED |
| Horizontal Overflow | PASSED |
| Action Bar (flex-wrap) | PASSED |
| Media Scaling | PASSED |
| Picker Constraints | PASSED |

All 4 files have correct responsive implementations. No horizontal overflow issues remain. The comment system is production-ready for mobile screens down to 320px.

