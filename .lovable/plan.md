

## Analysis

The current positioning math calculates:
- `cx = size/2 + cos(angle) * orbitRadius - halfItem`
- Button size = `logoSize + 6` (64px), but the button element itself may have inconsistent sizing due to the inner content layout.

## Fix

The issue is that the button's content (gradient wrapper + image) may not perfectly fill the button dimensions, causing a visual offset. The fix:

1. **Explicitly size the gradient wrapper** to fill the button with `w-full h-full`
2. **Use `flex items-center justify-center`** on the button to ensure content is centered within
3. **Ensure the img dimensions match exactly** within the padding

### Changes in `src/components/feed/EcosystemWheel.tsx`:

- On the `<button>`: add `flex items-center justify-center` 
- On the gradient `<div>`: add `w-full h-full flex items-center justify-center` to guarantee the image is centered within the gold ring
- Ensure consistent sizing: button = itemSize × itemSize, gradient div fills it, image = logoSize × logoSize

This ensures the visual center of each icon (including its gold border) aligns exactly with the calculated orbit point.

