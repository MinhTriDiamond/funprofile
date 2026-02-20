
# Gỡ ban tài khoản angelanhnguyet (Angel AI Treasury)

## Lý do
Tài khoản `angelanhnguyet` là ví Angel AI Treasury chính thức, không phải tài khoản farm coin. Đã bị ban nhầm khi xử lý cụm gian lận Thanh Hóa ngày 12/01/2026.

## Các bước thực hiện

### Bước 1: Gỡ ban tài khoản
Cập nhật bảng `profiles` cho user `ac174b69-1a24-4a9a-bf74-e448b9a754cf`:
- `is_banned` -> `false`
- `reward_status` -> `pending` (trạng thái bình thường)

### Bước 2: Xóa ví khỏi danh sách đen
Xóa bản ghi ví `0x416336c3b7acae89a47ead2707412f20da159ac8` khỏi bảng `blacklisted_wallets`.

### Bước 3: Ghi audit log
Tạo bản ghi trong `audit_logs` ghi nhận hành động gỡ ban với lý do "Angel AI Treasury - ban nhầm, xác nhận bởi admin".

---

**Chi tiết kỹ thuật:**
- Sử dụng SQL UPDATE trực tiếp trên bảng `profiles`
- DELETE bản ghi trong `blacklisted_wallets` (ID: `bdbca9c5-e5bc-4a5e-a2d9-e587541fc5ed`)
- INSERT audit log để lưu lịch sử thao tác
