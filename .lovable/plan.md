

## Sửa lỗi nhạc bị tắt khi chuyển trang + chỉ giữ 1 bài hát

### Nguyên nhân
`ValentineMusicButton` nằm trong `FacebookNavbar`, mà navbar nằm trong từng page component (ví dụ `Feed`). Khi chuyển route (ví dụ từ `/` sang `/profile`), component bị **unmount rồi mount lại** → audio bị dừng, state bị reset.

### Giải pháp
1. **Tạo module audio singleton** (`src/lib/globalAudio.ts`) — lưu trạng thái nhạc (đang phát hay không, volume) ở **ngoài React**, không bị ảnh hưởng bởi component lifecycle. Audio object tồn tại suốt session.

2. **Sửa `ValentineMusicButton.tsx`**:
   - Xoá tất cả bài hát khác, chỉ giữ **Light Economy Anthem**
   - Bỏ dropdown chọn bài, bỏ import `ChevronDown`
   - Đọc/ghi state từ global audio singleton thay vì local state
   - Khi mount lại → đồng bộ UI với trạng thái audio thật (đang phát hay không)
   - Chỉ còn: nút play/pause + volume slider

3. **Không cần sửa `App.tsx` hay `FacebookNavbar.tsx`** — chỉ cần audio object sống ngoài React là đủ.

### Chi tiết kỹ thuật
- `globalAudio.ts`: export các hàm `play()`, `pause()`, `toggle()`, `setVolume()`, `getState()` — quản lý 1 instance `HTMLAudioElement` duy nhất
- Component chỉ gọi các hàm này và listen sự kiện để sync UI
- Khi user quay lại tab → component mount lại → đọc `getState()` → hiển thị đúng trạng thái (đang phát/dừng, volume)

