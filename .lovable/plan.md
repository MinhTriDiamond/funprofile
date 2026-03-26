

## Tăng cỡ chữ đồng đều trong bảng "Tổng Đã Tặng"

### Thay đổi

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Tăng font-size bảng**: Đổi `text-sm` (14px) thành `text-[15px]` trên `<table>` — tăng 2px cho toàn bộ
2. **Đồng nhất cỡ chữ**: Xóa các class override cỡ chữ riêng lẻ:
   - Cột Email/User: bỏ `text-xs` → dùng cỡ chung `text-[15px]`
   - Cột Ví: bỏ `text-xs` → dùng cỡ chung
   - Cột Số lượng: bỏ `text-base` → dùng cỡ chung
   - AvatarFallback: giữ nguyên `text-[10px]` (quá nhỏ để thay đổi)
3. **Header**: Tăng header từ `text-sm` (mặc định) lên cùng `text-[15px]`

### Kết quả
Tất cả chữ và số trong bảng (Email, Họ Tên, Mã Ví, Số Lượng, Ngày, Giờ) đều cùng cỡ 15px, đồng đều và dễ đọc.

