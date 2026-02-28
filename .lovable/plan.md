

# Fix Light Community Badge Colors

## Problem
The Light Level badges in the LIGHT COMMUNITY board use dark-theme colors (`text-emerald-300`, `bg-emerald-600/20`) that appear nearly invisible on the white/light background. The text is unreadable.

## Solution
Update the color scheme in `TopRanking.tsx` to use solid, visible green tones — matching the style shown in the screenshot reference (like the honorboard badges with clear green backgrounds and dark text).

### Changes to `src/components/feed/TopRanking.tsx`:

**1. `getLevelColor` function** — Change from transparent dark colors to solid light-green badges with dark green text:
- Light Architect: solid emerald background with dark emerald text
- Light Guardian: solid teal background with dark teal text  
- Light Builder: solid green background with dark green text
- Light Sprout: solid lime background with dark lime text
- Default: solid stone background

**2. `getTrendColor` function** — Use darker shades visible on white:
- Growing: dark emerald text
- Reflecting: dark amber text
- Default: gray text

**3. Username text** — Ensure `text-primary` is visible (already should be dark on light theme, no change needed)

### File modified:
- `src/components/feed/TopRanking.tsx` — Update color classes in `getLevelColor` and `getTrendColor` functions only

