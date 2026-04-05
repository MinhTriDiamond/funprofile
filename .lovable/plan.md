

# Nâng cấp giao diện Reels: thanh tiến trình video, tooltip, nút tặng quà

## Vấn đề hiện tại
1. Không có thanh hiển thị thời gian / tiến trình video (progress bar) để user biết đang xem đến đâu
2. Không có nút Play/Pause trực quan — chỉ có thể tap vào video
3. Các nút bên phải (Like, Comment, Share, Bookmark, Mute) không có tooltip khi hover
4. Thiếu nút **Tặng quà** cho user tặng quà trực tiếp trong Reels

## Giải pháp

### 1. Thêm thanh tiến trình video + thời gian vào `ReelPlayer.tsx`
- Thêm state `currentTime`, `duration` từ sự kiện `onTimeUpdate` và `onLoadedMetadata` của video
- Hiển thị **progress bar** ngang ở dưới cùng video (thanh mỏng, có thể kéo để tua)
- Hiển thị **thời gian** dạng `0:35 / 1:20` ở góc dưới trái
- Expose `currentTime`, `duration`, `isPlaying` ra ngoài qua callback hoặc ref để `ReelsFeed` sử dụng
- Thêm nút **Play/Pause** overlay ở giữa video khi tap 1 lần (hiện icon rồi fade out)

### 2. Thêm tooltip cho tất cả nút bên phải trong `ReelsFeed.tsx`
- Sử dụng thuộc tính `title` hoặc component `Tooltip` từ UI library
- Các tooltip:
  - Heart → "Thích"
  - MessageCircle → "Bình luận"  
  - Share2 → "Chia sẻ"
  - Bookmark → "Lưu"
  - Volume → "Tắt tiếng" / "Bật tiếng"
  - Gift (mới) → "Tặng quà"

### 3. Thêm nút Tặng quà vào cột nút bên phải
- Thêm nút `HandCoins` (icon vàng gold) vào giữa Share và Bookmark
- Khi bấm → mở `UnifiedGiftSendDialog` với `recipientId` là chủ reel hiện tại
- Truyền thông tin profile của chủ reel làm `presetRecipient`

## File cần sửa
| File | Thay đổi |
|------|----------|
| `src/components/reels/ReelPlayer.tsx` | Thêm progress bar, hiển thị thời gian, nút play/pause |
| `src/components/reels/ReelsFeed.tsx` | Thêm nút tặng quà, tooltip cho tất cả nút, import DonationButton/UnifiedGiftSendDialog |

