

## Nguyên nhân lỗi

User "Minh Trí Test 1" đăng nhập bằng ví, hệ thống tự tạo email giả `e3e97a95mado@wallet.fun.rich` (dùng cho magic link auth). Email này có `email_confirmed_at` nên `useLoginMethods` nhận diện nhầm là "đã liên kết Email OTP".

**Gốc rễ**: Hook `useLoginMethods` chỉ kiểm tra `!!authUser?.email` mà không phân biệt email thật vs email placeholder hệ thống.

## Giải pháp

Thêm logic phát hiện email placeholder trong `useLoginMethods.ts`:

```typescript
// Email placeholder patterns (system-generated, not real user emails)
const isPlaceholderEmail = (email?: string) => {
  if (!email) return true;
  return email.endsWith('@wallet.fun.rich') || email.endsWith('@fun.phone');
};

const emailExists = !!authUser?.email && !isPlaceholderEmail(authUser.email);
```

Khi email là `@wallet.fun.rich` hoặc `@fun.phone`, hệ thống sẽ coi như chưa có email → hiển thị đúng "Chưa liên kết" cho Email OTP.

### File thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/useLoginMethods.ts` | Thêm `isPlaceholderEmail()` filter, sửa logic `emailExists` |

Thay đổi nhỏ, chỉ ảnh hưởng 2-3 dòng code trong hook.

