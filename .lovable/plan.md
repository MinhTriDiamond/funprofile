

# Backfill "Đã rút" cho toàn bộ user từ bảng donations

## Hiện trạng
- `reward_claims`: 2 bản ghi (angelaivan, 500.000 CAMLY)
- `donations` từ Treasury (`9e702a6f...`): **241 giao dịch**, **126 user**, tổng **91.320.999 CAMLY**
- Hàm `get_user_honor_stats` đọc `claimed_amount` từ `reward_claims` → hiện tại gần như toàn bộ user hiện 0

## Kế hoạch

### 1. Tạo Edge Function `backfill-reward-claims`
- Xác thực admin (kiểm tra `user_roles`)
- Xóa toàn bộ `reward_claims` hiện tại (2 bản ghi)
- Truy vấn `donations` với `sender_id = Treasury` và `status = confirmed`
- Map `wallet_address` từ `profiles`
- Insert vào `reward_claims` theo batch (50/lần)
- Trả về kết quả xác nhận

### 2. Deploy và chạy Edge Function
- Deploy function
- Gọi POST để thực hiện backfill

### 3. Không cần thay đổi code frontend
- `CoverHonorBoard` đã đọc `claimed_amount` từ RPC `get_user_honor_stats`
- RPC đã đọc từ `reward_claims` (dòng 153-154)
- Sau khi backfill, tất cả 126 user sẽ tự động hiển thị đúng "Đã rút"

### Kết quả mong đợi
- 241 bản ghi được chèn vào `reward_claims`
- 126 user hiển thị đúng số CAMLY đã rút trên Honor Board
- User bị ban vẫn giữ nguyên dữ liệu kiểm toán
- `angelthutrang`: Đã rút = 500.000
- Tổng "Đã rút" toàn hệ thống = **91.320.999 CAMLY**

