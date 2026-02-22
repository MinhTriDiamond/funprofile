

## Cập nhật Bảng Danh Dự + Admin Dashboard

### Thay đổi trên Bảng Danh Dự (AppHonorBoard)

**Hiện tại** bảng có 8 mục:
1. Tong Thanh Vien
2. Tong Bai Viet
3. Tong Hinh Anh
4. Tong Video
5. Tong Phan Thuong (CAMLY tinh toan)
6. Tong Tien Luu Thong (CAMLY circulating)
7. Circulating USDT
8. Circulating BTCB

**Sau thay doi** se co 7 muc:
1. Tong Thanh Vien (giu nguyen, da tru banned)
2. Tong Bai Viet
3. Tong Hinh Anh
4. Tong Video
5. Tong Phan Thuong (CAMLY tinh toan)
6. **Treasury da nhan** (CAMLY cua vi FUN Profile Treasury - hien 180.000.000) -- MOI
7. **CAMLY da rut** (tong so CAMLY user rut thanh cong tu reward_claims) -- MOI
8. ~~Circulating USDT~~ -- XOA
9. ~~Circulating BTCB~~ -- XOA

### Thay doi tren Admin (Users.tsx)

- `totalUsers` trong bảng quản lý user sẽ chỉ đếm user chưa bị ban (khớp với Honor Board)

### Chi tiet ky thuat

**1. Migration - Cap nhat `get_app_stats` RPC:**
- Thêm 2 cột mới: `treasury_received` (CAMLY trong ví treasury) và `total_camly_claimed` (tổng CAMLY đã rút thành công)
- `treasury_received`: lấy từ bảng `system_config` (key = `TREASURY_CAMLY_RECEIVED`, giá trị 180.000.000) để admin có thể cập nhật khi cần
- `total_camly_claimed`: `SELECT SUM(amount) FROM reward_claims`
- Bỏ 2 cột `total_usdt_circulating` và `total_btcb_circulating`

**2. Frontend - `AppHonorBoard.tsx`:**
- Cập nhật interface `AppStats` để có `treasuryReceived` và `totalCamlyClaimed`
- Thêm 2 stat items mới với icon Wallet và Coins + CAMLY logo
- Xóa phần dynamic token balances (USDT, BTCB)
- Xóa import `bnbLogo`, `usdtLogo`, `btcbLogo` (không cần nữa)

**3. Frontend - `useUserDirectory.ts`:**
- Sửa `totalUsers` chỉ đếm user có `is_banned = false`

**4. Translations - `translations.ts`:**
- Thêm key `treasuryReceived` và `totalCamlyClaimed` cho tất cả ngôn ngữ

