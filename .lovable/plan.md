

## Chỉnh chiều rộng bảng "Tổng Đã Tặng" cho giống hình mẫu (~900px)

### Nguyên nhân
Component `DialogContent` trong `src/components/ui/dialog.tsx` có class cứng `sm:max-w-lg` (512px) ở desktop. Dù `ClaimHistoryModal` truyền `max-w-[1400px]`, class cứng này có độ ưu tiên cao hơn và ghi đè, khiến dialog luôn bị giới hạn ~512px.

### Giải pháp

**File: `src/components/feed/ClaimHistoryModal.tsx`**
- Thay `max-w-[1400px] w-[98vw]` bằng `sm:max-w-[950px] w-[95vw]` để dialog rộng ~950px trên desktop (tương tự hình mẫu "Lịch sử giao dịch cá nhân")
- Thêm `!important` override: dùng `!sm:max-w-[950px]` để ghi đè class `sm:max-w-lg` từ base component

**File: `src/components/ui/dialog.tsx`** (nếu cần)
- Nếu Tailwind `!` prefix không đủ, sẽ thay `sm:max-w-lg` thành chỉ là default, cho phép className prop ghi đè được. Cách an toàn nhất: giữ nguyên dialog.tsx, chỉ dùng `!sm:max-w-[950px]` trong ClaimHistoryModal.

### Kết quả
Dialog sẽ rộng ~950px trên desktop, đủ chỗ hiển thị tất cả cột (User, Họ tên, Ví, Số lượng, Ngày, Giờ) không bị chồng chữ.

