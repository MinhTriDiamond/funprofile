

# Chuyển auth-email-hook sang dùng Resend API

## Vấn đề hiện tại

`auth-email-hook` đang dùng `sendLovableEmail` (hệ thống email managed của Lovable) để gửi tất cả email xác thực. Hệ thống này đang gặp lỗi (có thể do credit hoặc DNS `notify.fun.rich` chưa verify xong).

Dự án đã có `RESEND_API_KEY` hoạt động tốt (đang dùng cho SSO OTP, merge request...) và domain `fun.rich` đã verify trên Resend.

## Giải pháp

Sửa `auth-email-hook/index.ts` để thay thế `sendLovableEmail` bằng Resend API trực tiếp, giữ nguyên:
- Webhook verification (vẫn cần nhận auth events từ hệ thống)
- Template rendering (giữ nguyên 6 template React Email đã style)
- Preview endpoint (giữ nguyên)

## Chi tiết thay đổi

### File: `supabase/functions/auth-email-hook/index.ts`

1. **Thay import**: Bỏ `sendLovableEmail` từ `@lovable.dev/email-js`, thêm `Resend` từ `esm.sh`
2. **Sửa hàm `handleWebhook`**: Thay đoạn gọi `sendLovableEmail` bằng:
   - Lấy `RESEND_API_KEY` từ env
   - Gọi `resend.emails.send()` với `from: "FUN Ecosystem <noreply@fun.rich>"` 
   - Vẫn gọi callback_url để báo cho hệ thống biết email đã gửi
3. **From name**: Thống nhất `FUN Ecosystem <noreply@fun.rich>` cho tất cả 6 loại email

### Cũng sửa From name trong 3 SSO functions

- `sso-merge-approve`: `FUN Profile` → `FUN Ecosystem`
- `sso-merge-request`: `FUN Profile` → `FUN Ecosystem`
- `sso-resend-webhook`: `FUN Profile` → `FUN Ecosystem`

### Deploy

Deploy lại 4 edge functions: `auth-email-hook`, `sso-merge-approve`, `sso-merge-request`, `sso-resend-webhook`

## Lưu ý quan trọng

- `RESEND_API_KEY` đã có sẵn trong secrets
- Domain `fun.rich` đã được verify trên Resend (các SSO function đang gửi thành công)
- Không cần thay đổi template — chỉ thay đổi cách gửi email
- Preview endpoint vẫn hoạt động bình thường (không liên quan đến sending)

