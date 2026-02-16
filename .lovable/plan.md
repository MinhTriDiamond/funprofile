

## Phát hiện nhiều tài khoản trên cùng thiết bị - Tự động pending + thông báo Admin

### Tình trạng hiện tại
- Bảng `pplp_device_registry` hiện **trống** (0 bản ghi) - không có dữ liệu thiết bị nào được thu thập
- Bảng `login_ip_logs` có 231 bản ghi, phát hiện nhiều IP đáng ngờ (1 IP có tới 30 tài khoản khác nhau)
- Edge function `claim-reward` đã có logic kiểm tra shared device nhưng không hoạt động vì không có data
- Hiện tại chưa có cơ chế thu thập fingerprint thiết bị từ client

### Giải pháp

#### Bước 1: Thu thập Device Fingerprint khi đăng nhập
Tạo hàm sinh fingerprint đơn giản trên client (kết hợp screen size, timezone, language, platform, userAgent) rồi gửi lên server khi đăng nhập thành công.

**File mới: `src/utils/deviceFingerprint.ts`**
- Sinh hash từ: `screen.width`, `screen.height`, `navigator.language`, `navigator.platform`, `Intl.DateTimeFormat().resolvedOptions().timeZone`, `navigator.hardwareConcurrency`
- Sử dụng SHA-256 để tạo hash ngắn gọn

**File sửa: `src/components/auth/UnifiedAuthForm.tsx`**
- Sau khi đăng nhập thành công (dòng 67-74), gửi thêm device_hash lên edge function `log-login-ip`

#### Bước 2: Cập nhật Edge Function `log-login-ip`
- Nhận thêm `device_hash` từ request body
- Lưu `device_hash` vào bảng `pplp_device_registry` (upsert theo user_id + device_hash)
- Kiểm tra ngay lập tức: nếu cùng device_hash có > 1 user_id khac nhau:
  - Chuyển reward_status = `on_hold` cho user hiện tại
  - Ghi `pplp_fraud_signals` với signal_type = `SHARED_DEVICE`
  - Tạo notification cho tất cả admin (type = `admin_shared_device`)

#### Bước 3: Bổ sung kiểm tra IP trùng trong `claim-reward`
- Ngoài kiểm tra `pplp_device_registry` (đã có), thêm kiểm tra `login_ip_logs`: nếu cùng IP có > 2 user khác nhau trong 7 ngày gần đây, thêm vào `fraudReasons`

### Chi tiết kỹ thuật

**1. File mới `src/utils/deviceFingerprint.ts`**
```typescript
export async function getDeviceHash(): Promise<string> {
  const raw = [
    screen.width, screen.height, screen.colorDepth,
    navigator.language, navigator.platform,
    navigator.hardwareConcurrency,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 32);
}
```

**2. Sửa `src/components/auth/UnifiedAuthForm.tsx`** (dòng 67-74)
- Import `getDeviceHash` 
- Gửi device_hash trong body khi invoke `log-login-ip`

**3. Sửa `supabase/functions/log-login-ip/index.ts`**
- Đọc `device_hash` từ request body
- Upsert vào `pplp_device_registry`
- Kiểm tra shared device: nếu phát hiện > 1 user cùng device_hash:
  - Update `profiles.reward_status = 'on_hold'` + ghi `admin_notes`
  - Insert `pplp_fraud_signals`
  - Tạo notification cho admin (query `user_roles` where role = 'admin', insert notification cho mỗi admin)

**4. Sửa `supabase/functions/claim-reward/index.ts`** (sau dòng 229)
- Thêm kiểm tra IP: query `login_ip_logs` cho user, lấy các IP gần đây, kiểm tra xem IP đó có nhiều user khác không

### Luồng hoạt động

1. User đăng nhập thanh cong
2. Client sinh device_hash va gui len `log-login-ip`
3. Server luu device_hash vao `pplp_device_registry`
4. Server kiem tra: device_hash nay co user khac khong?
5. Neu co: tu dong `on_hold` + thong bao admin
6. Admin nhan notification, vao tab "Lam dung" de duyet thu cong
