

# Bỏ yêu cầu Luật Ánh Sáng trước Đăng ký/Đăng nhập

## Thay đổi

Hiện tại, khi user truy cập `/auth`, Guard yêu cầu phải đồng ý Luật Ánh Sáng **trước** khi được phép đăng ký/đăng nhập. Cần sửa để:

- `/auth` luôn được truy cập tự do (không cần đồng ý trước)
- Kiểm tra Luật Ánh Sáng chỉ xảy ra **sau khi đăng nhập thành công**, trước khi navigate đến `/`
- Khi user đăng xuất, redirect về `/auth` thay vì `/law-of-light`
- Guest không đăng nhập truy cập các trang công khai bình thường
- User chưa đăng nhập truy cập trang protected → redirect về `/auth`

## Luồng mới

```text
User truy cập /auth → Đăng ký/Đăng nhập tự do
  |
  +-- Đăng nhập thành công → handleAuthSuccess()
        |
        +-- Kiểm tra profiles.law_of_light_accepted
        +-- TRUE  → navigate('/')
        +-- FALSE → navigate('/law-of-light')

User đã đăng nhập, hard refresh bất kỳ trang nào:
  |
  +-- LawOfLightGuard kiểm tra DB
  +-- law_of_light_accepted = TRUE → cho phép
  +-- law_of_light_accepted = FALSE → redirect /law-of-light
```

## Chi tiết kỹ thuật

### File: `src/components/auth/LawOfLightGuard.tsx`

**Thay đổi 1** (dòng 34-45): Bỏ block chặn `/auth`. Thêm `/auth` vào danh sách public paths:

```typescript
const publicPaths = ['/law-of-light', '/docs', '/auth'];
```

Xóa toàn bộ block `if (location.pathname.startsWith('/auth'))`.

**Thay đổi 2** (dòng 59-61): Khi user chưa đăng nhập truy cập trang protected, redirect về `/auth` thay vì `/law-of-light`:

```typescript
navigate('/auth', { replace: true });
```

**Thay đổi 3** (dòng 135): Khi user đăng xuất, redirect về `/auth` thay vì `/law-of-light`:

```typescript
navigate('/auth', { replace: true });
```

### File: `src/components/auth/UnifiedAuthForm.tsx`

Không cần thay đổi -- logic kiểm tra `law_of_light_accepted` trong `handleAuthSuccess` đã hoạt động đúng (kiểm tra DB sau khi đăng nhập, navigate `/` hoặc `/law-of-light`).

## Tệp thay đổi

| Tệp | Thay đổi |
|------|----------|
| `src/components/auth/LawOfLightGuard.tsx` | Cho phép `/auth` truy cập tự do, redirect về `/auth` thay vì `/law-of-light` khi chưa đăng nhập hoặc đăng xuất |

