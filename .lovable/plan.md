

## Kế hoạch: Thêm tính năng Đổi mật khẩu trong Settings

### Phân tích hiện trạng
- Đã có `SetPasswordDialog` — dùng cho lần đầu đặt mật khẩu (không yêu cầu mật khẩu cũ)
- Đã có `hasPassword` flag từ `useLoginMethods` để biết user đã có mật khẩu chưa
- Trong phần "Mật khẩu" của SecuritySettings, khi `hasPassword = true` → hiện tại không có action nào (không có nút "Đổi mật khẩu")

### Thực hiện

#### 1. Tạo `ChangePasswordDialog` (`src/components/security/ChangePasswordDialog.tsx`)
- Form gồm 3 trường: **Mật khẩu hiện tại**, **Mật khẩu mới**, **Xác nhận mật khẩu mới**
- Xác thực mật khẩu hiện tại bằng `supabase.auth.signInWithPassword({ email, password: currentPassword })` trước khi cho đổi
- Đổi mật khẩu bằng `supabase.auth.updateUser({ password: newPassword })`
- Validation giống SetPasswordDialog (≥8 ký tự, 1 chữ hoa, 1 số)
- Log action `password_changed` qua RPC `log_security_action`
- Hiển thị màn hình thành công sau khi đổi xong

#### 2. Cập nhật `SecuritySettingsContent.tsx`
- Import `ChangePasswordDialog`
- Thêm state `showChangePassword`
- Khi `hasPassword = true`: hiển thị nút **"Đổi mật khẩu"** thay vì không có action
- Cập nhật mục Mật khẩu trong danh sách methods:
  ```
  action: hasPassword ? () => setShowChangePassword(true) : (hasEmailLoginMethod ? () => setShowSetPassword(true) : undefined)
  actionLabel: hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'
  ```

### Files cần tạo/sửa
1. **Tạo mới**: `src/components/security/ChangePasswordDialog.tsx`
2. **Sửa**: `src/components/settings/SecuritySettingsContent.tsx` — thêm import, state và nút đổi mật khẩu

