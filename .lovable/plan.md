

## Mở rộng dialog và bỏ thanh trượt ngang

### Nguyên nhân
- Dialog hiện tại giới hạn `sm:!max-w-[950px]` nhưng bảng có `min-w-[1200px]` — nên bảng rộng hơn dialog, tạo thanh trượt ngang.
- Từ hình mẫu, bảng admin có 5 cột chính (Email, Họ Tên, Mã Ví, Số Lượng, Ngày) và vừa khít trong khung dialog.

### Giải pháp

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Bỏ cột `#` và cột `Giờ`** — hình mẫu không có 2 cột này, giảm số cột để vừa khung
2. **Bỏ cột `User` (username + avatar)** — hình mẫu chỉ hiển thị Email thay vì username. Khi không phải admin, hiển thị username thay vào cột Email
3. **Tăng dialog width**: `sm:!max-w-[1100px] w-[98vw]`
4. **Bỏ `min-w-[1200px]`** trên table, thay bằng `w-full` — để bảng tự co giãn theo dialog, không tạo thanh trượt ngang
5. **Bỏ `truncate`** trên các cell để chữ hiển thị đầy đủ, không bị cắt

### Kết quả
- Bảng hiển thị 5 cột: Email (hoặc User), Họ Tên, Mã Ví, Số Lượng, Ngày Rải — vừa khít dialog ~1100px
- Không còn thanh trượt ngang
- Tất cả chữ hiển thị đầy đủ, gọn đẹp

