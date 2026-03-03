

# Lọc user đã ban khỏi cảnh báo gian lận

## Vấn đề
Trong `log-login-ip/index.ts`, khi phát hiện shared device hoặc email farm, hệ thống liệt kê **tất cả** user liên quan mà không kiểm tra `is_banned`. Dẫn đến:
- Admin nhận thông báo lặp lại chứa user đã ban
- Không phân biệt được cảnh báo mới vs đã xử lý

## Giải pháp

### File: `supabase/functions/log-login-ip/index.ts`

#### 1. Hàm `handleDeviceFingerprint` (shared device detection)
- Sau khi lấy danh sách `otherUsers` từ `pplp_device_registry` (dòng 148-150), thêm bước **lọc bỏ user đã ban** bằng cách query `profiles` với `is_banned = false`
- Chỉ gửi thông báo nếu còn **>2 user chưa ban** dùng chung thiết bị
- Thông báo chỉ liệt kê username/email của user **chưa ban**
- Vẫn giữ nguyên logic `on_hold` và `is_flagged` cho user chưa ban

#### 2. Hàm `detectEmailFarm` (email farm detection)
- Sau khi tìm `matchingUsers` từ auth, lọc bỏ user có `is_banned = true` trong profiles
- Chỉ gửi cảnh báo nếu còn >=3 user chưa ban có email tương tự
- Metadata thông báo chỉ chứa user chưa ban

#### 3. Thêm dedup thông báo
- Trước khi insert notification `admin_shared_device`, kiểm tra xem đã có thông báo tương tự trong 1 giờ qua chưa (tương tự logic đã có cho `admin_email_farm`)
- Tránh spam thông báo mỗi lần user đăng nhập

### Deploy
- Deploy lại `log-login-ip`

