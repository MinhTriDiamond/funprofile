

## Xử lý lỗi "email rate limit exceeded" khi đăng ký

### Vấn đề
User `nguyenlekieu49@gmail.com` đăng ký nhiều lần liên tục, hệ thống xác thực trả lỗi `429: email rate limit exceeded` (giới hạn gửi email xác thực). Hiện tại frontend chỉ hiển thị nguyên văn lỗi tiếng Anh, không thân thiện với người dùng Việt.

Auth logs xác nhận: user này đã tạo **nhiều tài khoản trùng email** (ít nhất 4 actor_id khác nhau cùng email), mỗi lần đều trigger gửi email xác thực → vượt rate limit.

### Nguyên nhân gốc
- Dòng 134 trong `ClassicEmailLogin.tsx`: `toast.error(error.message || t('authErrorGeneric'))` — hiển thị thông báo lỗi thô từ Supabase mà không dịch.
- User có thể đã nhấn "Đăng ký" nhiều lần hoặc không nhận được email nên thử lại liên tục.

### Giải pháp

**File:** `src/components/auth/ClassicEmailLogin.tsx`

Trong block `catch` (dòng ~123-137), thêm xử lý riêng cho lỗi rate limit **trước** dòng `toast.error` chung:

```ts
if (error.message?.includes('rate limit') || 
    error.code === 'over_email_send_rate_limit') {
  toast.error(
    'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi vài phút rồi thử lại nhé! ⏳',
    { duration: 8000 }
  );
  setLoading(false);
  return;
}
```

Đồng thời thêm key dịch cho cả 2 ngôn ngữ trong `translations.ts`:
- EN: `authErrorRateLimit: 'Too many requests. Please wait a few minutes and try again.'`
- VI: `authErrorRateLimit: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi vài phút rồi thử lại nhé! ⏳'`

### File thay đổi
1. `src/components/auth/ClassicEmailLogin.tsx` — bắt lỗi rate limit, hiện thông báo tiếng Việt thân thiện
2. `src/i18n/translations.ts` — thêm key `authErrorRateLimit`

