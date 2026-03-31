

## Chỉnh thông báo trên desktop hiển thị trang đầy đủ như mobile

### Phân tích hiện tại
- **Mobile**: Bấm chuông → navigate đến `/notifications` (trang đầy đủ với filter tabs, danh sách chi tiết, fraud alerts, v.v.)
- **Desktop**: Bấm chuông → mở **Popover nhỏ** (dropdown 420px, giới hạn chiều cao, không có đầy đủ filter tabs)

User muốn desktop cũng hiển thị trang `/notifications` đầy đủ giống mobile.

### Thay đổi

**File: `src/components/layout/NotificationDropdown.tsx`**

Bỏ logic phân biệt mobile/desktop. Cả hai đều navigate đến `/notifications` khi bấm chuông:
- Xóa toàn bộ phần Popover desktop (dòng 69-240)
- Giữ lại chỉ phần button navigate (dòng 46-66), áp dụng cho cả desktop

**File: `src/pages/Notifications.tsx`**

Chỉnh layout để hiển thị đẹp trên desktop:
- Header `top-[3cm]` → responsive cho desktop (có thể cần chỉnh vị trí)
- `bottom-[72px] lg:bottom-0` đã có sẵn — OK
- Thêm `max-w-3xl mx-auto` hoặc tương tự để content không quá rộng trên desktop
- Đảm bảo padding `sm:px-[2cm]` phù hợp

### Kết quả
Desktop và mobile đều hiển thị cùng trang thông báo đầy đủ với filter tabs, fraud alerts, danh sách chi tiết.

