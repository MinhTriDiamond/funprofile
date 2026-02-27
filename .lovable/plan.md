

# Fix GIF Picker — Single column layout

## Problem
From screenshot: GIFs in 2-column grid are overlapping and hard to see. User wants each GIF displayed individually, stacked vertically.

## Changes

### GifPicker.tsx — Switch to single column layout
- Change grid from `grid-cols-2` to `grid-cols-1` so each GIF gets full width
- Keep `aspect-video` ratio for natural 16:9 display
- Each GIF will be clearly visible, one after another vertically
- Keep existing border, rounded corners, hover effects

**Line 70**: Change `grid grid-cols-2 gap-2` → `grid grid-cols-1 gap-3`
**Line 81**: Change `col-span-2` → `col-span-1` for empty state

1 file changed, 2 lines modified.

