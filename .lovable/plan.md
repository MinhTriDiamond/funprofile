

## Phân tích nguyên nhân

### Vấn đề 1: OTP spinner bị kẹt
**Nguyên nhân gốc**: Trong `Auth.tsx`, callback `onAuthStateChange` sử dụng `async/await` để gọi `checkBanStatus()`. Theo tài liệu Supabase, **không được `await` bên trong `onAuthStateChange`** vì nó chặn xử lý auth state, khiến `setSession()` trong `EmailOtpLogin` bị treo hoặc không hoàn tất đúng cách → UI kẹt ở spinner.

Ngoài ra, `handleAuthSuccess` trong `UnifiedAuthForm.tsx` cũng thực hiện nhiều `await` tuần tự (getSession, getDeviceHash, DB queries) trước khi navigate, gây chậm.

### Vấn đề 2: Email verification chậm
Đây chủ yếu do cold start của Edge Function. Không có bug logic, nhưng có thể tối ưu UX bằng cách hiện trạng thái rõ ràng hơn.

## Kế hoạch sửa

### 1. Sửa `Auth.tsx` - Không await trong onAuthStateChange
- Chuyển `checkBanStatus` thành fire-and-forget bên trong `setTimeout(..., 0)`
- Xóa `async` khỏi callback `onAuthStateChange`
- Thêm navigate `/` cho trường hợp SIGNED_IN không phải SSO (backup navigation)

### 2. Sửa `EmailOtpLogin.tsx` - Giảm blocking trước onSuccess
- Sau `setSession` thành công, gọi `onSuccess` ngay lập tức
- Chuyển profile update (`last_login_platform`) thành fire-and-forget
- Bỏ `getSession` check dư thừa (setSession đã đảm bảo session)

### 3. Sửa `UnifiedAuthForm.tsx` - Tối ưu handleAuthSuccess
- `getDeviceHash` + `log-login-ip` đã là fire-and-forget → giữ nguyên
- Chuyển law_of_light sync thành non-blocking
- Navigate ngay sau khi verify session, không chờ DB queries phụ

### 4. Sửa `LinkEmailDialog.tsx` - Thêm UX cho cold start
- Hiện thông báo "Có thể mất 5-10 giây..." khi đang gửi

### Tóm tắt files cần sửa
- `src/pages/Auth.tsx` - Fix async trong onAuthStateChange
- `src/components/auth/EmailOtpLogin.tsx` - Giảm blocking
- `src/components/auth/UnifiedAuthForm.tsx` - Tối ưu handleAuthSuccess
- `src/components/security/LinkEmailDialog.tsx` - UX improvement

