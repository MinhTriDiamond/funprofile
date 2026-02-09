
# Kế Hoạch: Sửa Lỗi Redirect Khi Xem Law of Light

## Vấn Đề

Khi user đã chấp nhận Law of Light và muốn xem lại trang này, họ bị redirect tự động về Feed (`/`) ngay lập tức. Điều này xảy ra vì logic kiểm tra redirect chạy trước khi kiểm tra parameter `?view=true`.

## Nguyên Nhân

Trong `src/pages/LawOfLight.tsx`, đoạn code `checkAuth()` redirect user về Feed nếu họ đã chấp nhận, mà không kiểm tra xem user có đang ở chế độ "view only" hay không.

```text
┌─────────────────────────────────────────────────────────────┐
│ User đã đăng nhập + đã chấp nhận Law of Light               │
│                         │                                   │
│                         ▼                                   │
│               navigate('/') ← Redirect ngay!                │
│                                                             │
│ ❌ Không kiểm tra ?view=true                                 │
│ ❌ Không cho phép xem lại nội dung                           │
└─────────────────────────────────────────────────────────────┘
```

## Giải Pháp

Kiểm tra `?view=true` trước khi redirect. Nếu có parameter này, cho phép user xem trang mà không redirect.

```text
┌─────────────────────────────────────────────────────────────┐
│ User vào /law-of-light                                      │
│                         │                                   │
│                         ▼                                   │
│            Có ?view=true không?                             │
│           /             \                                   │
│         Có               Không                              │
│          │                  │                               │
│          ▼                  ▼                               │
│    ✅ Cho xem           Đã accept?                          │
│    (không redirect)    /         \                          │
│                      Có           Không                     │
│                       │             │                       │
│                       ▼             ▼                       │
│                 navigate('/')   ✅ Cho xem                   │
└─────────────────────────────────────────────────────────────┘
```

## Thay Đổi Code

### File: `src/pages/LawOfLight.tsx`

Sửa useEffect để kiểm tra `view=true` trước:

| Trước | Sau |
|-------|-----|
| Set `isReadOnly` sau khi check auth | Set `isReadOnly` trước, dùng để quyết định redirect |
| Luôn redirect nếu đã accept | Chỉ redirect nếu đã accept VÀ không có `?view=true` |

### Logic mới:

```typescript
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const viewMode = params.get('view') === 'true';
  setIsReadOnly(viewMode);
  
  // Nếu đang ở chế độ xem lại, không redirect
  if (viewMode) return;
  
  // Chỉ redirect nếu KHÔNG có ?view=true
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('law_of_light_accepted')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.law_of_light_accepted) {
        navigate('/');
      }
    }
  };
  checkAuth();
}, [location, navigate]);
```

## Files Cần Sửa

| File | Hành động |
|------|-----------|
| `src/pages/LawOfLight.tsx` | **Sửa** - Thêm điều kiện kiểm tra `viewMode` trước khi redirect |

## Kết Quả Mong Đợi

- Vào `/law-of-light` khi đã accept → Redirect về Feed (giữ nguyên)
- Vào `/law-of-light?view=true` khi đã accept → Cho phép xem lại (không redirect)
- Vào `/law-of-light` khi chưa accept → Hiển thị trang để accept (giữ nguyên)
