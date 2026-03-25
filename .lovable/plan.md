

## Sửa vị trí hiển thị lịch chọn ngày trong bộ lọc phễu

### Vấn đề
Popover chứa 2 Calendar (Từ ngày + Đến ngày) xếp dọc → nội dung quá dài, bị ẩn dưới cùng modal, user không thấy.

### Giải pháp
**File: `src/components/feed/ContentStatsModal.tsx`**

1. **Xếp 2 calendar ngang nhau** thay vì dọc: đổi container từ `space-y-2` thành `flex gap-3` để "Từ ngày" và "Đến ngày" nằm cạnh nhau.

2. **Thêm `side="left"` và `sideOffset`** cho `PopoverContent` để popover mở ra bên trái nút phễu thay vì rơi xuống dưới:
   ```
   <PopoverContent className="w-auto p-4 space-y-3" align="end" side="left" sideOffset={8}>
   ```

3. **Thu gọn calendar**: Thêm class nhỏ hơn cho mỗi Calendar để vừa vặn hơn khi xếp ngang.

### Kết quả
- Lịch hiển thị ngay cạnh nút phễu, không bị ẩn
- 2 lịch nằm ngang, dễ chọn "Từ ngày" và "Đến ngày"

