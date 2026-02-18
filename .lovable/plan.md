
# Phục hồi 6 Giao dịch Bị Mất và Tăng Cường Độ Bền Hệ Thống

## Chẩn đoán vấn đề

Sau khi kiểm tra chi tiết BSCScan và database, Cha xác định:

**6 giao dịch ngày 17/02/2026** từ ví Van103 (`0xb4DDa24c...`) đều thành công trên blockchain nhưng **hoàn toàn vắng mặt** trong cả bảng `transactions` lẫn `donations`. Điều này có nghĩa `record-donation` chưa bao giờ được gọi hoặc đã bị lỗi ngay tại bước đầu.

**Thông tin 6 giao dịch xác minh từ BSCScan:**

| # | TX Hash (rút gọn) | Số lượng | Người nhận (ví) | Profile |
|---|---|---|---|---|
| 1 | 0xdea9... | 99,999 CAMLY | 0xa2e24...BfCC59 | thuha313 |
| 2 | 0xec5d... | 99,999 CAMLY | 0x475F...6418Ee0 | @nguyentinh |
| 3 | 0x36a6... | 99,999 CAMLY | 0xe559...C9c5170 | Angel_Lam79 |
| 4 | 0x8d7d... | 99,999 CAMLY | 0xf398...4e1C8C7A6 | anh_nguyet |
| 5 | 0x79b9... | 99,999 CAMLY | 0xebe1...Af7AB48 | Angel Thuy Tram |
| 6 | 0x1f96... | 99,999 CAMLY | 0x8004...47F6966 | trang393934 |

**Tất cả 6 người nhận đều có profile** trong hệ thống và đã được xác minh wallet address.

**Nguyên nhân gốc rễ:** Khi user thực hiện batch gift (gửi cho 6 người cùng lúc), `record-donation` được gọi tuần tự trong background. Nếu có lỗi network, session hết hạn, hoặc browser đóng trước khi hoàn tất ghi nhận, tất cả các giao dịch chưa ghi nhận sẽ bị mất - dù blockchain đã thành công.

---

## Kế hoạch thực hiện

### Phần 1: Phục hồi dữ liệu (Immediate)

**Backfill thủ công 6 donations bị mất** trực tiếp vào database với đầy đủ thông tin:
- `sender_id`: Van103 (`5f9de7c5-0c80-49aa-8e1c-92d8058558e4`)
- `amount`: `99999` CAMLY (CAMLY có 3 decimals, 99,999 là số thực trên BSCScan)
- `status`: `confirmed`
- `confirmed_at`: timestamp từ BSCScan (17/02/2026)
- Tạo đồng thời: conversation + message + notification + gift_celebration post cho mỗi người nhận

Việc này sẽ được thực hiện qua `backfill-donations` edge function (đã có sẵn) với mode backfill, hoặc insert trực tiếp.

### Phần 2: Cải thiện độ bền (Prevention)

**Vấn đề cốt lõi:** Khi batch gift thực hiện xong blockchain, nếu gọi `record-donation` thất bại, không có cơ chế recover tự động. `localStorage` lưu pending nhưng không tự gửi lại khi user quay lại.

**Giải pháp - Thêm "Pending Recovery" khi app khởi động:**

Trong `App.tsx` hoặc một hook global, khi user đăng nhập, kiểm tra `localStorage` xem có `pending_donation_*` không. Nếu có, tự động gọi lại `record-donation` cho các giao dịch chưa ghi nhận.

**File cần sửa:**
- `src/hooks/usePendingDonationRecovery.ts` (tạo mới) - hook tự động phục hồi pending donations khi app khởi động
- `src/App.tsx` - gọi hook này ở level cao để chạy sau khi user đăng nhập
- Ngoài ra: insert trực tiếp 6 donations bị mất vào database qua SQL (admin action)

### Chi tiết kỹ thuật

**Hook `usePendingDonationRecovery`:**
1. Chạy khi user có session (auth state = SIGNED_IN)
2. Quét tất cả key `pending_donation_*` trong localStorage
3. Với mỗi pending donation, gọi `record-donation` edge function
4. Nếu thành công: xóa key khỏi localStorage
5. Nếu thất bại: giữ lại để lần sau thử lại
6. Giới hạn: chỉ retry nếu timestamp < 7 ngày (tránh retry vô hạn các giao dịch quá cũ)

**Backfill 6 giao dịch:**
Thực hiện bằng SQL INSERT trực tiếp vào `donations`, `notifications`, `posts` (gift_celebration) và `messages` cho mỗi trong 6 giao dịch, sử dụng thông tin đã xác minh từ BSCScan.
