

# Bổ sung 33 giao dịch unmapped vào bảng Claim History

## Hiện trạng
- `reward_claims`: **241 bản ghi**, **126 user** có profile
- **33 giao dịch** từ Treasury (tổng **6.918.000 CAMLY**) có `recipient_id = NULL` — chỉ có địa chỉ ví trong `metadata->>'to_address'`
- Bảng `reward_claims` yêu cầu `user_id NOT NULL` → không thể insert trực tiếp 33 giao dịch này

## Kế hoạch

### 1. Thay đổi schema `reward_claims`
- Cho phép `user_id` nullable (`ALTER COLUMN user_id DROP NOT NULL`)
- Điều này cho phép lưu các giao dịch gửi đến ví ngoài hệ thống

### 2. Insert 33 giao dịch unmapped
- Dùng Edge Function `backfill-reward-claims` (đã có) hoặc tạo migration insert
- Lấy từ `donations` WHERE `sender_id = Treasury` AND `recipient_id IS NULL`
- `user_id = NULL`, `wallet_address = metadata->>'to_address'`, `amount`, `created_at`

### 3. Cập nhật ClaimHistoryModal
- Xử lý `user_id = NULL`: hiển thị **"Ví ngoài hệ thống"** thay vì username
- Avatar fallback hiển thị icon ví
- Tìm kiếm cũng hoạt động với wallet address
- Tổng bản ghi sẽ tăng lên **274** (241 + 33)

### Kết quả
- Bảng Claim History hiển thị đầy đủ **274 giao dịch** / **6.918.000 + 91.320.999 = 98.238.999 CAMLY**
- Các ví không có tài khoản được đánh dấu rõ ràng cho mục đích kiểm toán

