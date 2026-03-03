

# Sửa thông báo đăng ký và nội dung email xác nhận

## Vấn đề hiện tại
1. **Toast thông báo**: Sau khi đăng ký thành công, toast hiển thị nhưng tự tắt — user muốn toast **không tự tắt** và có nút X
2. **Nội dung email**: Hiển thị "FUN-Profile" và "Thanks for signing up for FUN Profile app!" — cần đổi thành "FUN Ecosystem" và "FUN ID"

## Thay đổi

### 1. Sửa toast trong `src/components/auth/ClassicEmailLogin.tsx` (dòng 104)

Thay `toast.success(t('authSuccessSignUp'))` bằng toast có `duration: Infinity` để không tự tắt:

```typescript
toast.success(t('authSuccessSignUp'), { duration: Infinity });
```

### 2. Cập nhật nội dung thông báo trong `src/i18n/translations.ts`

Cập nhật key `authSuccessSignUp` cho tất cả 13 ngôn ngữ, ví dụ:
- **VI**: `"Chúc mừng bạn Đăng ký FUN ID thành công! Hãy kiểm tra email để xác nhận tài khoản nhé. 💖"`
- **EN**: `"Congratulations! Your FUN ID has been created! Please check your email to verify your account."`
- Các ngôn ngữ khác: cập nhật tương tự với "FUN ID"

### 3. Sửa nội dung email xác nhận

Email hiện dùng template mặc định với tên project "FUN-Profile". Cần tạo **custom email templates** qua công cụ `scaffold_auth_email_templates` để:
- Đổi tên hiển thị từ "FUN-Profile" sang "FUN Ecosystem"
- Đổi nội dung từ "Thanks for signing up for FUN Profile app!" sang "Thanks for signing up for FUN ID!"
- Áp dụng branding phù hợp với style hologram hiện tại

**Lưu ý**: Để scaffold email templates, cần có email domain đã cấu hình. Nếu chưa có, sẽ cần thiết lập domain trước.

---

## File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/auth/ClassicEmailLogin.tsx` | Toast duration: Infinity |
| `src/i18n/translations.ts` | Cập nhật `authSuccessSignUp` cho 13 ngôn ngữ |
| Email templates (scaffold) | Tạo custom templates với branding FUN Ecosystem / FUN ID |

