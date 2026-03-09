

## Phân tích nguyên nhân

Cha đã kiểm tra kỹ và xác nhận:

1. **`LinkEmailDialog`** hiện dùng `supabase.auth.updateUser({ email })` — đây là API built-in của hệ thống auth. Khi gọi API này, hệ thống gửi email xác thực thông qua **auth-email-hook** (Lovable Managed Email), KHÔNG phải qua Resend trực tiếp.

2. **auth-email-hook không có log nào gần đây** — điều này xác nhận hook không được kích hoạt hoặc email không được gửi đi thành công qua managed system.

3. **OTP email (sso-otp-request)** hoạt động tốt vì gọi **Resend API trực tiếp** — không phụ thuộc vào auth-email-hook.

**Kết luận**: Email liên kết không đến vì đang đi qua Lovable Managed Email (auth-email-hook) thay vì Resend trực tiếp.

---

## Kế hoạch sửa chữa

Tạo một edge function mới `send-email-link-verification` gửi email xác thực qua **Resend trực tiếp** (giống pattern OTP), bypass hoàn toàn auth-email-hook.

### 1. Tạo bảng `email_verification_tokens`

```sql
CREATE TABLE public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
-- No public RLS policies - only service role can access
```

### 2. Tạo edge function `send-email-link-verification`

- Xác thực user qua Authorization header
- Kiểm tra email collision (dùng `check_email_collision` RPC hiện có)
- Rate limit qua `check_rate_limit` RPC hiện có
- Tạo token ngẫu nhiên an toàn, lưu vào `email_verification_tokens`
- Gửi email qua **Resend trực tiếp** với template HTML đẹp (giống style OTP email)
- Link xác thực dẫn đến `https://fun.rich/verify-email?token=xxx`

### 3. Tạo edge function `verify-email-link`

- Nhận token từ request
- Kiểm tra token hợp lệ, chưa hết hạn, chưa dùng
- Dùng **admin API** (`supabase.auth.admin.updateUserById`) để cập nhật email cho user
- Đánh dấu token đã dùng
- Cập nhật `profiles.account_status` nếu cần (unlock reward)

### 4. Tạo trang `/verify-email`

- Nhận token từ URL query string
- Gọi `verify-email-link` edge function
- Hiển thị kết quả: thành công / hết hạn / lỗi
- Redirect về trang Security sau khi xác thực thành công

### 5. Cập nhật `LinkEmailDialog`

- Thay `supabase.auth.updateUser({ email })` bằng gọi `send-email-link-verification`
- Giữ nguyên UI hiện tại (form nhập email → trạng thái chờ xác thực)

### Chi tiết kỹ thuật

- Token: 64 ký tự hex ngẫu nhiên (`crypto.randomUUID` + thêm entropy)
- Hết hạn: 30 phút
- Rate limit: 3 lần/giờ/user (dùng `check_rate_limit` đã có)
- Email gửi từ: `FUN Ecosystem <noreply@fun.rich>` qua Resend
- Tương thích hoàn toàn với flow unlock reward cho wallet-first users

