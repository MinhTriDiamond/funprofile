

## Thu gọn cột và rút gọn mã ví

### Thay đổi

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Bỏ `table-fixed`** — chuyển sang `table-auto` để các cột tự co giãn theo nội dung, không còn khoảng trống thừa
2. **Bỏ `w-[%]`** trên tất cả `<th>` — để trình duyệt tự tính chiều rộng vừa với nội dung
3. **Rút gọn mã ví**: Thay hiển thị đầy đủ `c.wallet_address` bằng `truncateWallet(c.wallet_address)` (đã có sẵn hàm, hiển thị dạng `0x3827...f103`)
4. **Thêm `whitespace-nowrap`** cho cột Email/User, Họ Tên, Mã Ví để giữ gọn trên 1 dòng

### Kết quả
Các cột sát với nội dung, không còn khoảng trống thừa. Mã ví hiển thị rút gọn đầu-cuối. Ngày và Giờ hiển thị rõ ràng.

