

## Chỉnh nút Nhạc: hover hiện volume + nút đến Reels

### Tổng quan
Khi đưa chuột/nhấp vào nút nhạc → popover hiển thị:
1. **Thanh chỉnh âm lượng** (đã có)
2. **Nút dẫn đến trang Reels** (`/reels`) — khi mở sẽ thấy video bài hát

### Thay đổi

**1. `src/components/layout/ValentineMusicButton.tsx`**
- Thêm import `Film` icon từ lucide-react và `useNavigate` từ react-router-dom
- Trong `PopoverContent` (cả desktop và mobile), thêm một nút "Xem Video" bên dưới volume slider:
  - Icon `Film` + text "Xem Video"
  - Click → `navigate('/reels')` để chuyển đến trang Reels
  - Style: nút nhỏ gọn, màu destructive/gold phù hợp theme

### Kết quả
- Hover/click nút nhạc → popover có:
  - Volume slider (chỉnh âm lượng)
  - Nút "Xem Video" dẫn đến `/reels`
- Nhạc vẫn phát liên tục khi chuyển trang nhờ globalAudio singleton

