

## Phân tích lỗi: False positive trong phát hiện thiết bị dùng chung

### Nguyên nhân gốc

Hệ thống fingerprint hiện tại (`deviceFingerprint.ts`) sử dụng các tín hiệu **phần cứng thuần túy**: screen size, colorDepth, language, platform, canvas, WebGL, deviceMemory, touchPoints, devicePixelRatio. Trên mobile, **tất cả điện thoại cùng model + cùng trình duyệt** sẽ tạo ra hash **giống hệt nhau**. Ví dụ: 100 người dùng Samsung Galaxy A15 + Chrome đều có cùng device_hash → hệ thống nghĩ tất cả dùng chung 1 thiết bị.

Thêm vào đó, `log-login-ip` (line 204-205) **ghi đè vô điều kiện** `reward_status = "on_hold"` cho tất cả users cùng hash, kể cả những tài khoản **đã được Admin duyệt trước đó**. Mỗi lần bất kỳ ai trong nhóm đăng nhập → tất cả bị hold lại.

### Kế hoạch sửa — 2 file

#### 1. `src/utils/deviceFingerprint.ts` — Thêm entropy riêng biệt cho mỗi trình duyệt

Thêm một **persistent random ID** (lưu trong localStorage) vào fingerprint. Điều này đảm bảo:
- Mỗi **browser instance** có hash riêng (phát hiện đúng multi-account trên cùng trình duyệt)
- Hai người dùng **khác nhau** trên cùng model điện thoại **không bị nhầm** là cùng thiết bị

```text
Trước: hash(screen + canvas + webgl + ...)  → trùng giữa cùng model
Sau:   hash(screen + canvas + webgl + ... + localStorage_random_id)  → unique per browser
```

#### 2. `supabase/functions/log-login-ip/index.ts` — Không ghi đè tài khoản đã được Admin duyệt

Sửa logic hold (line 203-206):
- **Bỏ qua** users có `reward_status = 'approved'` — Admin đã xác minh rồi, không hold lại
- Chỉ hold users có `reward_status` chưa được duyệt (null, 'pending', etc.)

Điều này ngăn vòng lặp: Admin duyệt → user đăng nhập → bị hold lại → Admin phải duyệt lại.

### Chi tiết kỹ thuật

**deviceFingerprint.ts:**
- Thêm function `getOrCreateBrowserId()` — đọc/tạo random UUID trong `localStorage` key `fp_browser_id`
- Thêm UUID này vào mảng `raw` trước khi hash

**log-login-ip/index.ts (line 203-206):**
- Thay vì hold tất cả `activeUserIds`, lọc bỏ users có `reward_status = 'approved'`
- Chỉ hold users chưa được duyệt

