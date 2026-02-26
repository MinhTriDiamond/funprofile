

# Tích hợp Social Interactions Feature Pack v2.0

## Tổng quan

Triển khai đầy đủ gói Like/Comment/Share v2.0 với các tối ưu theo yêu cầu: Twemoji SVG, GIF/Sticker picker lazy-loaded, ShareDialog với Web3 link, HeartAnimation GPU-accelerated, và chuẩn hóa 6 reaction types.

## Danh sách thay đổi

### Tạo mới: 9 files

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/lib/emojiUtils.ts` | Utility: `toCodePoint()`, `getTwemojiUrl()`, `parseEmojiInText()` dùng Twemoji CDN |
| 2 | `src/components/ui/TwemojiImage.tsx` | Component render emoji thành `<img>` SVG từ CDN |
| 3 | `src/components/feed/TwemojiText.tsx` | `React.memo` — parse text, thay unicode emoji bằng Twemoji images |
| 4 | `src/data/curatedGifs.ts` | 50+ GIF URL public từ Giphy (không cần API key) |
| 5 | `src/data/curatedStickers.ts` | 90+ sticker Emoji Kitchen, 7 danh mục |
| 6 | `src/components/feed/GifPicker.tsx` | GIF picker với search + grid, lazy loaded |
| 7 | `src/components/feed/StickerPicker.tsx` | Sticker picker 7 danh mục, lazy loaded |
| 8 | `src/components/feed/HeartAnimation.tsx` | Double-tap heart animation, CSS `transform: scale()` GPU-accelerated |
| 9 | `src/components/feed/ShareDialog.tsx` | Dialog share: caption, privacy, Facebook/X/WhatsApp/Telegram/Email, Copy link, Copy Web3 Profile Link |

### Cập nhật: 6 files

| # | File | Thay đổi |
|---|------|----------|
| 10 | `src/components/feed/ReactionButton.tsx` | Đổi `care`→`sad`, `pray`→`angry`. Thêm micro-interaction `hover:scale-110` trên từng reaction icon |
| 11 | `src/components/feed/ReactionSummary.tsx` | Cập nhật REACTION_ICONS: bỏ `care`/`pray`, thêm `sad`/`angry` |
| 12 | `src/components/feed/EmojiPicker.tsx` | Render emoji bằng `TwemojiImage` thay vì unicode text thuần |
| 13 | `src/components/feed/CommentMediaUpload.tsx` | Thêm nút GIF picker + Sticker picker (lazy import) |
| 14 | `src/components/feed/CommentItem.tsx` | Xử lý `g:` và `s:` prefix trong `image_url`, dùng `TwemojiText` cho nội dung |
| 15 | `src/components/feed/FacebookPostCard.tsx` | Thay share dropdown → `ShareDialog`. Thêm `HeartAnimation` double-tap trên `MediaGrid`. Chia sub-components: `PostHeader`, `PostActions` |

## Chi tiết kỹ thuật

### Data format (prefix ngắn)

```text
Database image_url column:
  Normal image: https://r2.example.com/image.jpg
  GIF:          g:https://media.giphy.com/xxx.gif
  Sticker:      s:https://emojik.vercel.app/s/xxx
```

### Twemoji CDN

```text
Base: https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg
"😀" → codepoint "1f600" → .../1f600.svg
```

### 6 Reaction types chuẩn

```text
like 👍  |  love ❤️  |  haha 😂  |  wow 😮  |  sad 😢  |  angry 😠
```

### HeartAnimation — GPU Acceleration

```text
Sử dụng CSS transform: scale(0) → scale(1.2) → scale(1)
với will-change: transform, opacity
Không dùng width/height animation → đảm bảo 60fps mobile
```

### Lazy Loading cho GIF/Sticker Pickers

```tsx
const GifPicker = lazy(() => import('./GifPicker'));
const StickerPicker = lazy(() => import('./StickerPicker'));
// Wrapped in <Suspense> khi render
```

### ShareDialog — Web3 Profile Link

```text
Nếu user có public_wallet_address hoặc ENS:
  Copy link dạng: https://funprofile.lovable.app/profile/0x1234...abcd
Nếu không có wallet:
  Copy link thông thường: https://funprofile.lovable.app/profile/{user_id}
```

### Sub-components trong FacebookPostCard

```text
FacebookPostCard.tsx sẽ tách logic share thành:
  - ShareDialog (component riêng, file mới)
  - HeartAnimation (component riêng, file mới)
Giữ PostHeader, PostActions inline nhưng gọn hơn nhờ delegate logic ra ShareDialog
```

### Không cần thay đổi database

Các bảng `comments`, `reactions`, `shared_posts` đã tồn tại. Prefix `g:` và `s:` chỉ là convention trong `image_url` column (TEXT), không cần migration.

