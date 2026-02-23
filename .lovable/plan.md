
# Thêm Tài Khoản "bongsieuoi" Vào Danh Sách Ngoại Lệ

## Thông Tin

3 tài khoản Love House cần loại trừ:
- **LH_HaoQuangVuTru** (bongsieuoi5@gmail.com)
- **LH_ThinhVuong** (bongsieuoi2@gmail.com)
- **LH_Happy** (bongsieuoi1@gmail.com)

Cụm email "bongsieuoi" (sau khi chuẩn hóa: bỏ số cuối -> `bongsieuoi`) sẽ bị hệ thống gắn cờ EMAIL_FARM vì >= 3 tài khoản cùng tiền tố.

## Thay Doi

### 1. `supabase/functions/daily-fraud-scan/index.ts`
- Thêm `'bongsieuoi'` vào mảng `EMAIL_FARM_ALLOWLIST` (dòng 15):
```
const EMAIL_FARM_ALLOWLIST = ['hoangtydo', 'bongsieuoi'];
```

### 2. `supabase/functions/log-login-ip/index.ts`
- Thêm cùng mảng allowlist và kiểm tra trong hàm `detectEmailFarm` trước khi gắn cờ:
```
const EMAIL_FARM_ALLOWLIST = ['hoangtydo', 'bongsieuoi'];
```
- Thêm điều kiện bỏ qua nếu emailBase khớp allowlist ngay đầu hàm `detectEmailFarm`.

### 3. Khôi phục trạng thái
- Kiểm tra xem 3 tài khoản này có đang bị đình chỉ (`on_hold`) không, nếu có sẽ chuyển về `approved`.
- Giải quyết (resolve) các tín hiệu gian lận EMAIL_FARM liên quan.

Chỉ sửa 2 file edge function, deploy lại.
