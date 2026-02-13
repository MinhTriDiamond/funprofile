
# Tối Ưu Đăng Nhập - Tăng Timeout và Thêm Auto-Retry

## Vấn Đề

Edge Function `sso-otp-request` hoạt động bình thường (test trực tiếp ~2 giây), nhưng khi gọi từ published site lần đầu, cold start có thể mất >15 giây khiến timeout bắn lỗi "Kết nối chậm, vui lòng thử lại".

## Kế Hoạch Sửa

### 1. Tăng timeout từ 15s lên 25s
Cold start Edge Function có thể mất 10-20 giây. Timeout 15s quá ngắn.

### 2. Thêm auto-retry (1 lần) cho OTP request
Nếu lần gọi đầu timeout (cold start), tự động thử lại 1 lần nữa (lần 2 function đã warm, sẽ nhanh hơn nhiều).

### 3. Hiển thị trạng thái rõ ràng hơn khi đang retry
Thay vì chỉ "Đang khởi tạo...", hiển thị "Đang kết nối..." lần đầu và "Đang thử lại..." khi retry.

## Chi Tiết Kỹ Thuật

### Files sửa:

**1. `src/components/auth/EmailOtpLogin.tsx`**
- Tăng timeout: 15000 -> 25000ms
- Thêm auto-retry logic cho `handleSendOtp`: nếu timeout lần 1, tự động thử lại 1 lần (timeout 15s cho lần retry vì function đã warm)
- Thêm state `retrying` để hiển thị trạng thái "Đang thử lại..."
- Tương tự cho `handleVerifyOtp`

**2. `src/components/auth/ClassicEmailLogin.tsx`**
- Tăng timeout: 15000 -> 25000ms cho signIn/signUp
- Classic login gọi trực tiếp Supabase Auth (không qua Edge Function) nên ít bị cold start, chỉ cần tăng timeout

## Tóm Tắt

| File | Thay Doi |
|------|----------|
| EmailOtpLogin.tsx | Timeout 25s + auto-retry 1 lan |
| ClassicEmailLogin.tsx | Timeout 25s |

- **2 files sửa**, **0 files mới**
