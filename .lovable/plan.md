# Cập nhật bộ Reaction + Fix emoji ô vuông — 4 files

## Mục tiêu
- Thay sad/angry bằng gratitude (🙏) + care (🥰), đặt lên đầu
- Dùng TwemojiImage (SVG) thay cho raw emoji text để fix ô vuông
- Thứ tự mới: 🙏 🥰 👍 ❤️ 😂 😮

## File 1: `src/components/feed/ReactionButton.tsx`

### Thêm import TwemojiImage (sau dòng 7)
```tsx
import { TwemojiImage } from '@/components/ui/TwemojiImage';
```

### Thay mảng REACTION_TYPES (dòng 9-16)
```tsx
const REACTION_TYPES = [
  { type: 'gratitude', icon: '🙏', labelKey: 'reactionGratitude' as const, color: '#a855f7' },
  { type: 'care', icon: '🥰', labelKey: 'reactionCare' as const, color: '#f97316' },
  { type: 'like', icon: '👍', labelKey: 'like' as const, color: '#3b82f6' },
  { type: 'love', icon: '❤️', labelKey: 'reactionLove' as const, color: '#ef4444' },
  { type: 'haha', icon: '😂', labelKey: 'haha' as const, color: '#eab308' },
  { type: 'wow', icon: '😮', labelKey: 'reactionWow' as const, color: '#eab308' },
];
```

### Dòng 345 — button chính, TwemojiImage size=20
```tsx
<span className="text-lg sm:text-xl transition-transform duration-200 pointer-events-none"><TwemojiImage emoji={activeReaction.icon} size={20} /></span>
```

### Dòng 407 — popup picker, TwemojiImage size=28
```tsx
<span className="relative z-10"><TwemojiImage emoji={reaction.icon} size={28} /></span>
```

## File 2: `src/components/feed/CommentReactionButton.tsx`

### Thêm import TwemojiImage (sau dòng 12)
```tsx
import { TwemojiImage } from '@/components/ui/TwemojiImage';
```

### Thay mảng REACTION_TYPES (dòng 15-22)
```tsx
const REACTION_TYPES = [
  { type: 'gratitude', emoji: '🙏', labelKey: 'reactionGratitude', color: 'text-purple-500' },
  { type: 'care', emoji: '🥰', labelKey: 'reactionCare', color: 'text-orange-500' },
  { type: 'like', emoji: '👍', labelKey: 'like', color: 'text-blue-500' },
  { type: 'love', emoji: '❤️', labelKey: 'reactionLove', color: 'text-red-500' },
  { type: 'haha', emoji: '😂', labelKey: 'haha', color: 'text-yellow-500' },
  { type: 'wow', emoji: '😮', labelKey: 'reactionWow', color: 'text-yellow-600' },
];
```

### Dòng 217 — current reaction button → TwemojiImage size=16
### Dòng 235 — top reactions display → TwemojiImage size=14
### Dòng 252 — hover card list → TwemojiImage size=16
### Dòng 286 — picker popup → TwemojiImage size=24

## File 3: `src/components/feed/ReactionSummary.tsx`

### Thêm import TwemojiImage
### Thay REACTION_ICONS (dòng 19-26) — xóa sad/angry, thêm gratitude + care
```tsx
const REACTION_ICONS: Record<string, { icon: string; bgColor: string }> = {
  gratitude: { icon: '🙏', bgColor: 'bg-purple-500' },
  care: { icon: '🥰', bgColor: 'bg-orange-500' },
  like: { icon: '👍', bgColor: 'bg-blue-500' },
  love: { icon: '❤️', bgColor: 'bg-red-500' },
  haha: { icon: '😂', bgColor: 'bg-yellow-500' },
  wow: { icon: '😮', bgColor: 'bg-yellow-500' },
};
```
### Dòng 67-68 — bubble emoji → TwemojiImage size=14

## File 4: `src/components/feed/ReactionViewerDialog.tsx`

### Thêm import TwemojiImage
### Thay REACTION_ICONS (dòng 8-17) — xóa sad/angry/pray, thêm gratitude + care
```tsx
const REACTION_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  gratitude: { icon: '🙏', label: 'Biết ơn', color: '#a855f7' },
  care: { icon: '🥰', label: 'Thương thương', color: '#f97316' },
  like: { icon: '👍', label: 'Thích', color: '#3b82f6' },
  love: { icon: '❤️', label: 'Yêu thương', color: '#ef4444' },
  haha: { icon: '😂', label: 'Haha', color: '#eab308' },
  wow: { icon: '😮', label: 'Ngạc nhiên', color: '#eab308' },
};
```
### Dòng 144 — tab emoji → TwemojiImage size=18
### Dòng 188 — avatar badge → TwemojiImage size=14
