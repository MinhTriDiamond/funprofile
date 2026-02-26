

# Cập nhật bộ Reaction + Fix emoji ô vuông — 4 files

## Vấn đề
Emoji 🥰 hiển thị ô vuông vì render bằng unicode text thô. Dự án đã có sẵn component `TwemojiImage` render emoji dưới dạng SVG từ CDN — chỉ cần dùng nó thay cho `<span>{emoji}</span>`.

## Thay đổi chi tiết

### File 1: `src/components/feed/ReactionButton.tsx`
- Thêm `import { TwemojiImage } from '@/components/ui/TwemojiImage'`
- Thay mảng `REACTION_TYPES`: xóa sad/angry, thêm gratitude + care lên đầu
- Dòng 345: button chính → `<TwemojiImage emoji={activeReaction.icon} size={20} />`
- Dòng 407: popup picker → `<TwemojiImage emoji={reaction.icon} size={28} />`

### File 2: `src/components/feed/CommentReactionButton.tsx`
- Thêm import `TwemojiImage`
- Thay mảng `REACTION_TYPES` tương tự
- 4 chỗ render emoji text → TwemojiImage (size 16, 14, 16, 24 tùy context)

### File 3: `src/components/feed/ReactionSummary.tsx`
- Thêm import `TwemojiImage`
- Thay `REACTION_ICONS`: xóa sad/angry, thêm gratitude + care
- Bubble emoji → `<TwemojiImage size={14} />`

### File 4: `src/components/feed/ReactionViewerDialog.tsx`
- Thêm import `TwemojiImage`
- Thay `REACTION_ICONS`: xóa sad/angry/pray, thêm gratitude + care
- Tab emoji + avatar badge → TwemojiImage (size 18, 14)

### Thứ tự hiển thị cuối cùng: 🙏 🥰 👍 ❤️ 😂 😮

### Fallback an toàn
`TwemojiImage` đã có sẵn `onError` handler — khi CDN lỗi sẽ tự thay bằng unicode text, giao diện không bao giờ bị trống.

| File | Thay đổi |
|------|----------|
| ReactionButton.tsx | Đổi mảng + TwemojiImage size 20/28 |
| CommentReactionButton.tsx | Đổi mảng + TwemojiImage size 14/16/24 |
| ReactionSummary.tsx | Đổi REACTION_ICONS + TwemojiImage size 14 |
| ReactionViewerDialog.tsx | Đổi REACTION_ICONS + TwemojiImage size 14/18 |

