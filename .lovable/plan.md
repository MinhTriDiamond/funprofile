

## Mở rộng bảng chi tiết "Tổng Đã Tặng" (ClaimHistoryModal)

### Vấn đề
Bảng trong `ClaimHistoryModal` hiện tại có các cột bị co hẹp, khó nhìn rõ toàn bộ nội dung. Cần mở rộng chiều ngang để hiển thị đầy đủ tất cả cột.

### Thay đổi

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Tăng chiều ngang dialog**: Từ `max-w-5xl w-[90vw]` lên `max-w-7xl w-[95vw]` để bảng có nhiều không gian hơn
2. **Bảng giãn đều**: Đổi `min-w-max` thành `table-fixed w-full` để các cột giãn đều theo chiều ngang dialog
3. **Tăng padding cell**: Từ `p-2` lên `p-3` cho các cell, giúp dễ đọc hơn
4. **Tăng font-size số liệu**: Cột số lượng CAMLY tăng lên `text-base font-bold` cho nổi bật hơn
5. **Cột Token rộng hơn**: Cho cột `#` và `User` có chiều rộng cố định hợp lý

```text
Trước:
| # | User      | Họ tên | Ví        | Số lượng | Ngày     | Giờ  |  ← co hẹp

Sau:
| #  |  Người dùng    |  Họ Tên     |  Mã Ví           |  Số lượng    |  Ngày       |  Giờ   |  ← rộng, rõ ràng
```

