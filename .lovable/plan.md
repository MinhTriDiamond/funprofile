

# Sửa lỗi: Đăng xuất vẫn redirect về /law-of-light

## Nguyên nhân

File `src/pages/Auth.tsx` (dòng 20-25) có đoạn code kiểm tra localStorage `law_of_light_accepted_pending` — nếu không tìm thấy flag này, nó **redirect ngay về `/law-of-light`** trước khi trang Auth kịp render. Khi user đăng xuất, Guard đã redirect đúng về `/auth`, nhưng Auth.tsx lại đá user ra `/law-of-light` ngay lập tức.

Ngoài ra, `GuestSignupPrompt.tsx` (dòng 34) cũng navigate về `/law-of-light` thay vì `/auth`.

## Thay đổi

### 1. `src/pages/Auth.tsx` — Xóa block chặn (dòng 20-25)

Xóa hoàn toàn đoạn kiểm tra localStorage:

```typescript
// XÓA đoạn này:
const pending = localStorage.getItem('law_of_light_accepted_pending');
if (!pending) {
  navigate('/law-of-light', { replace: true });
  return;
}
```

Không cần kiểm tra ở đây nữa vì Luật Ánh Sáng chỉ được kiểm tra **sau khi đăng nhập thành công** trong `handleAuthSuccess` và `LawOfLightGuard`.

### 2. `src/components/auth/GuestSignupPrompt.tsx` — Đổi navigate (dòng 34)

```typescript
// Trước:
navigate('/law-of-light');
// Sau:
navigate('/auth');
```

Guest bấm "Đăng ký ngay" sẽ đến thẳng trang đăng ký, không cần qua Luật Ánh Sáng trước.

## Tệp thay đổi

| Tệp | Thay đổi |
|------|----------|
| `src/pages/Auth.tsx` | Xóa block redirect `/law-of-light` ở đầu useEffect |
| `src/components/auth/GuestSignupPrompt.tsx` | Đổi navigate từ `/law-of-light` sang `/auth` |

