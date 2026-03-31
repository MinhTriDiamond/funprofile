

## Hiển thị thông báo kiểu Facebook với dropdown preview + "Xem tất cả"

### Ý tưởng
Thay vì bấm chuông → navigate thẳng `/notifications`, sẽ hiển thị một **dropdown/popover** kiểu Facebook ngay tại chỗ với:
- Tiêu đề "Thông báo"
- Tabs "Tất cả" / "Chưa đọc"
- Danh sách **5 thông báo mới nhất** (compact)
- Nút **"Xem tất cả"** ở cuối → navigate đến `/notifications` (trang chi tiết đầy đủ)

### Thay đổi

**File: `src/components/layout/NotificationDropdown.tsx`**

1. **Thêm Popover** (từ shadcn `Popover`) khi bấm chuông:
   - Fetch 5 thông báo mới nhất từ bảng `notifications` (với actor profile)
   - Hiển thị compact: avatar + tên + nội dung rút gọn + thời gian + chấm xanh unread
   - Tabs đơn giản: "Tất cả" / "Chưa đọc"
   - Header có tiêu đề "Thông báo" + nút "Đánh dấu đã đọc"
   - Footer có nút **"Xem tất cả"** → `navigate('/notifications')`

2. **Click vào từng thông báo** trong dropdown → mark as read + navigate đến post/profile tương ứng (tái sử dụng logic từ trang Notifications)

3. **Giữ nguyên** badge unread count và realtime subscription hiện có

4. **Responsive**: 
   - Desktop: hiện Popover dropdown (width ~380px)
   - Mobile: vẫn navigate thẳng `/notifications` (vì màn hình nhỏ không phù hợp popover)

### Kết quả
- Desktop: bấm chuông → hiện dropdown preview 5 thông báo mới nhất kiểu Facebook → bấm "Xem tất cả" để vào trang chi tiết
- Mobile: bấm chuông → vào thẳng trang `/notifications`

