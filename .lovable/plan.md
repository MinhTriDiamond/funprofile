

## Sửa lỗi "Tổng đã nhận" hiển thị trống cho user thường

### Vấn đề
Khi user thường bấm vào ô **"Tổng đã nhận"** (CAMLY Claimed), modal mở lên nhưng hiện **"Không có lịch sử claim"** vì bảng `reward_claims` có RLS chỉ cho phép:
- **Admin**: xem tất cả claims
- **User thường**: chỉ xem claims **của chính mình**

Do ClaimHistoryModal query tất cả claims nhưng user thường chỉ nhận về claims của mình (thường là 0), nên modal hiện trống.

### Giải pháp
Tạo RPC `get_all_claim_history` với `SECURITY DEFINER` để trả về danh sách claims cho tất cả user, nhưng **ẩn thông tin nhạy cảm** (email) với user thường:

#### 1. Migration SQL
- Tạo function `get_all_claim_history()` trả về: `user_id, username, full_name, avatar_url, amount, wallet_address, created_at`
- Dùng `SECURITY DEFINER` để bypass RLS
- Join với `profiles` để lấy thông tin user

#### 2. Sửa `src/components/feed/ClaimHistoryModal.tsx`
- Thay query trực tiếp bảng `reward_claims` bằng gọi RPC `get_all_claim_history`
- Giữ nguyên phần email chỉ admin mới thấy (đã có logic `isAdmin` sẵn)
- Giữ nguyên search, PDF export, giao diện

### Quy mô
- 1 migration SQL (tạo RPC mới)
- 1 file frontend sửa (`ClaimHistoryModal.tsx`)

