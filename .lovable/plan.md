

# Sửa lỗi đăng ký tài khoản: Trùng tên người dùng & thông báo sau đăng ký

## Vấn đề

1. **Trùng tên người dùng (username)**: Khi đăng ký với tên đã tồn tại, hệ thống hiển thị lỗi kỹ thuật thô ("duplicate key value violates unique constraint") thay vì thông báo dễ hiểu.
2. **Thông báo sai sau đăng ký**: Sau khi đăng ký thành công, hệ thống hiển thị "Xác thực thất bại" vì nó cố gắng tạo phiên đăng nhập trong khi email chưa được xác thực.

## Giải pháp

### 1. Cập nhật trigger `handle_new_user()` trong cơ sở dữ liệu

Thêm logic thử lại (retry) khi gặp trùng username:
- Lần đầu: dùng đúng tên người dùng yêu cầu
- Nếu trùng: thêm hậu tố ngẫu nhiên 4 ký tự (ví dụ: `truongbien_a3f2`) và thử lại
- Tối đa 5 lần thử
- Làm sạch ký tự đặc biệt, đảm bảo tối thiểu 3 ký tự

### 2. Xử lý lỗi trùng username ở giao diện (`ClassicEmailLogin.tsx`)

- Trong khối `catch`, kiểm tra lỗi chứa `profiles_username_key`, `unique_violation`, hoặc `duplicate key`
- Hiển thị thông báo thân thiện: "Tên người dùng đã được sử dụng. Hãy thử: [gợi ý]"
- Tự động điền tên gợi ý vào ô nhập username để người dùng có thể chỉnh sửa hoặc dùng luôn

### 3. Sửa luồng sau đăng ký (`ClassicEmailLogin.tsx`)

- Khi `data.user` tồn tại nhưng `data.session` là `null` (tức email chưa xác thực): chỉ hiện thông báo thành công, **không** gọi `onSuccess()` để tránh lỗi "Xác thực thất bại"
- Cập nhật thông báo thành: *"Đăng ký thành công, hãy truy cập vào email để xác thực tài khoản của bạn nhé! 💖"*

### 4. Thêm bản dịch mới (`translations.ts`)

- Thêm key `authErrorUsernameTaken` cho tất cả 13 ngôn ngữ
- Cập nhật `authSuccessSignUp` tiếng Việt thành thông báo dài hơn, rõ ràng hơn

---

## Chi tiết kỹ thuật

### Tệp thay đổi

| Tệp | Thay đổi |
|------|----------|
| Database migration (SQL) | Cập nhật hàm `handle_new_user()` với logic retry + hậu tố ngẫu nhiên |
| `src/components/auth/ClassicEmailLogin.tsx` | Bắt lỗi trùng username, sửa luồng sau đăng ký |
| `src/i18n/translations.ts` | Thêm `authErrorUsernameTaken`, cập nhật `authSuccessSignUp` tiếng Việt |

### Database migration

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  attempt INT := 0;
BEGIN
  base_username := lower(trim(COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  )));
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  IF length(base_username) < 3 THEN base_username := 'user'; END IF;
  IF length(base_username) > 26 THEN base_username := left(base_username, 26); END IF;
  final_username := base_username;

  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, full_name, avatar_url)
      VALUES (NEW.id, final_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''));
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      attempt := attempt + 1;
      IF attempt >= 5 THEN RAISE; END IF;
      final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
    END;
  END LOOP;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
```

### ClassicEmailLogin.tsx - Xử lý lỗi trùng username

```typescript
// Trong khối catch (dòng 115)
if (error.message?.includes('profiles_username_key') ||
    error.message?.includes('unique_violation') ||
    error.message?.includes('duplicate key')) {
  const suggestion = username + '_' + Math.random().toString(36).substring(2, 6);
  setUsername(suggestion); // Tự động điền gợi ý
  toast.error(`Tên người dùng "${username}" đã được sử dụng. Hãy thử: ${suggestion}`);
  setLoading(false);
  return;
}
```

### ClassicEmailLogin.tsx - Sửa luồng sau đăng ký

```typescript
// Sau signUp thành công (dòng 100-113)
if (error) throw error;
if (data.user) {
  if (!data.session) {
    // Email chưa xác thực - chỉ hiện thông báo, không gọi onSuccess
    toast.success(t('authSuccessSignUp'));
    setLoading(false);
    return;
  }
  // Nếu có session (auto-confirm), tiếp tục bình thường
  onSuccess(data.user.id, true);
}
```

### Bản dịch mới (trích)

- **Tiếng Việt**: `authSuccessSignUp`: *"Đăng ký thành công, hãy truy cập vào email để xác thực tài khoản của bạn nhé! 💖"*
- **Tiếng Anh**: `authErrorUsernameTaken`: *"Username is already taken. Try: {suggestion}"*
- **Tiếng Việt**: `authErrorUsernameTaken`: *"Tên người dùng đã được sử dụng. Hãy thử: {suggestion}"*
- Tương tự cho 11 ngôn ngữ còn lại

