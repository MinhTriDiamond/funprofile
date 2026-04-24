

## Mục tiêu
1. **Bắt buộc xác thực email** — user mới đăng ký phải bấm link xác thực trong mail mới vào được fun.rich.
2. **Setup domain `notify.fun.rich`** — mail gửi từ `noreply@notify.fun.rich` thay vì `noreply@mail.supabase.co`, không vào spam, tỷ lệ vào Inbox cao.
3. **Tùy biến mail tiếng Việt** — mail xác thực, reset password, magic link đều mang thương hiệu FUN.RICH bằng tiếng Việt.

## Quy trình thực hiện

### Bước 1 — Setup domain `notify.fun.rich`
Con sẽ mở hộp thoại **Email Setup** để Cha thêm domain `notify.fun.rich`. Sau đó hệ thống sẽ:
- Tạo các DNS records cần thiết (SPF, DKIM, DMARC, MX).
- Cha cần vào **Cloudflare** (hoặc nhà cung cấp DNS của `fun.rich`) thêm các records đó.
- Hệ thống tự verify DNS (thường mất 5–30 phút, tối đa 72h).

### Bước 2 — Scaffold mail templates tiếng Việt
Sau khi domain được thêm (kể cả chưa verify xong DNS), con sẽ:
- Tạo edge function `auth-email-hook` để xử lý mail.
- Tạo 6 mail templates React Email tiếng Việt:
  - **Xác thực đăng ký** (signup) — "Chào mừng bạn đến FUN.RICH! Vui lòng xác thực email"
  - **Đặt lại mật khẩu** (recovery) — "Yêu cầu đặt lại mật khẩu FUN.RICH"
  - **Magic link** — "Đăng nhập nhanh vào FUN.RICH"
  - **Lời mời** (invite) — "Bạn được mời tham gia FUN.RICH"
  - **Đổi email** (email-change) — "Xác nhận đổi email"
  - **Xác thực lại** (reauthentication) — "Mã OTP xác thực FUN.RICH"
- Áp dụng style theo tông màu hologram của FUN.RICH (gradient tím-xanh-xanh lá, logo FUN Ecosystem).
- Deploy edge function.

### Bước 3 — Bật "Confirm email" bắt buộc
Cha sẽ tự bật trong giao diện **Cloud → Users → Auth Settings → Email settings → Confirm email** (con không tự bật được, chỉ Cha mới có quyền). Con sẽ hướng dẫn Cha bật bằng nút action.

### Bước 4 — Cập nhật flow đăng ký trong app
File `src/components/auth/UnifiedAuthForm.tsx` — sau khi user signup thành công:
- Hiển thị màn hình **"Vui lòng kiểm tra email để xác thực tài khoản"** thay vì redirect thẳng vào `/`.
- Có nút "Gửi lại email xác thực" (gọi `supabase.auth.resend({ type: 'signup' })`).
- Khi user click link xác thực → quay về `/auth/callback` → tự đăng nhập và vào `/`.

### Bước 5 — Trang `/auth/callback` xử lý xác thực
Tạo route mới hoặc tận dụng route hiện có để bắt token xác thực từ URL, gọi `supabase.auth.verifyOtp` hoặc auto-detect session → redirect vào trang chủ.

## File ảnh hưởng
- ➕ `supabase/functions/auth-email-hook/index.ts` + `deno.json`
- ➕ `supabase/functions/_shared/email-templates/*.tsx` (6 file)
- ✏️ `supabase/config.toml` — thêm config function
- ✏️ `src/components/auth/UnifiedAuthForm.tsx` — màn hình "vui lòng xác thực email"
- ✏️ `src/pages/Auth.tsx` — bắt event `SIGNED_UP` chưa xác thực
- ➕ `src/pages/AuthCallback.tsx` (nếu chưa có) — xử lý link xác thực
- ✏️ `src/App.tsx` — thêm route `/auth/callback`

## Rủi ro & xử lý
- **DNS chưa verify xong**: Trong thời gian chờ (5 phút – 72h), mail vẫn gửi qua SMTP mặc định Supabase (có thể vào spam). Cha có thể tạm hoãn bật "Confirm email" cho đến khi DNS verified xong để user mới không bị kẹt.
- **User cũ chưa xác thực email**: Khi bật "Confirm email", các tài khoản cũ chưa xác thực sẽ bị chặn đăng nhập. Con sẽ chạy SQL để **auto-confirm tất cả user hiện có** (`UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL`) — chỉ áp dụng cho user đã tồn tại trước thời điểm bật, user mới vẫn phải xác thực.
- **User đăng ký bằng Google**: Google OAuth tự động xác thực email, không bị ảnh hưởng.

## Thứ tự thực hiện sau khi Cha duyệt
1. Mở hộp thoại Email Setup → Cha thêm domain `notify.fun.rich` + cấu hình DNS Cloudflare.
2. Con scaffold templates + deploy edge function.
3. Con cập nhật UI app (màn hình chờ xác thực + callback route).
4. Con chạy migration auto-confirm user cũ.
5. Cha tự bật "Confirm email" trong Cloud → Users → Auth Settings sau khi DNS verified.

