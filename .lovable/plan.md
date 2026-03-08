

## Chẩn đoán: Đăng nhập bằng password nhưng `has_password` không được cập nhật

### Nguyên nhân gốc

Trong file `src/components/auth/ClassicEmailLogin.tsx`, khi người dùng **đăng nhập** bằng email + password (dòng 69-84), code chỉ cập nhật `last_login_platform` mà **KHÔNG** cập nhật `has_password: true`:

```typescript
// Dòng 79-81 — thiếu has_password: true
await supabase.from('profiles').update({
  last_login_platform: 'FUN Profile'
}).eq('id', data.user.id);
```

Trong khi đó, ở nhánh **đăng ký** (dòng 110-112), code lại set đúng:
```typescript
has_password: true, // ✅ chỉ có ở signup
```

Kết quả: User `leminhtri` đăng nhập thành công bằng password, nhưng cột `has_password` trong bảng `profiles` vẫn là `false/null` → banner "Đặt mật khẩu" vẫn hiện, trang Security Settings vẫn hiển thị "Chưa đặt".

### Kế hoạch sửa

**Sửa 1 file duy nhất**: `src/components/auth/ClassicEmailLogin.tsx`

Thêm `has_password: true` vào câu lệnh update profile khi login thành công (dòng 79-81):

```typescript
await supabase.from('profiles').update({
  last_login_platform: 'FUN Profile',
  has_password: true,
}).eq('id', data.user.id);
```

Logic: Nếu user đăng nhập thành công bằng `signInWithPassword`, thì chắc chắn họ đã có mật khẩu → flag `has_password` phải là `true`.

