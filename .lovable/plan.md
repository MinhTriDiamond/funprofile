
# Kiểm tra Luật Ánh Sáng trước khi cho phép truy cập

## Vấn đề hiện tại

Hiện tại có 2 lỗ hổng chính:

1. **`handleAuthSuccess` trong `UnifiedAuthForm.tsx`**: Khi user cũ đăng nhập (bất kỳ phương thức nào: OTP, ví, Google, email+password), hệ thống navigate thẳng đến `/` mà **không kiểm tra** `law_of_light_accepted` trong database.

2. **`LawOfLightGuard`**: Guard đã kiểm tra `law_of_light_accepted` từ database, nhưng có vấn đề timing — khi `handleAuthSuccess` gọi `navigate('/')`, Guard có thể chưa kịp re-check vì `isAllowed` đã `true` từ trước (dòng 20: `if (isAllowed) return`).

3. **localStorage `law_of_light_accepted_pending`**: Chỉ được lưu khi user đồng ý trên trang `/law-of-light` mà chưa đăng nhập. Nhưng nếu user đăng nhập mà chưa từng đồng ý, flag này không tồn tại → database không bao giờ được cập nhật.

## Giải pháp

Thêm **một bước kiểm tra duy nhất** trong `handleAuthSuccess` cho **tất cả phương thức đăng nhập**. Đây là điểm hội tụ chung — mọi phương thức (OTP, ví, Google, classic) đều gọi `handleAuthSuccess` sau khi xác thực thành công.

### Luồng mới cho tất cả phương thức:

```text
User đăng nhập thành công (bất kỳ phương thức)
  |
  +-- handleAuthSuccess()
        |
        +-- Kiểm tra profiles.law_of_light_accepted
        |
        +-- Nếu TRUE  → navigate('/')
        +-- Nếu FALSE → navigate('/law-of-light')
```

### Tệp thay đổi

| Tệp | Thay đổi |
|------|----------|
| `src/components/auth/UnifiedAuthForm.tsx` | Thêm kiểm tra `law_of_light_accepted` trong `handleAuthSuccess` trước khi navigate |
| `src/components/auth/LawOfLightGuard.tsx` | Sửa logic để reset `isAllowed` khi auth state thay đổi (SIGNED_IN), đảm bảo re-check |

## Chi tiết kỹ thuật

### 1. `UnifiedAuthForm.tsx` — `handleAuthSuccess` (dòng 56-85)

Thêm kiểm tra database sau khi xác nhận session, **trước khi** navigate:

```typescript
const handleAuthSuccess = async (userId: string, isNewUser: boolean, hasExternalWallet = false) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { /* giữ nguyên */ return; }

  // Log login IP (giữ nguyên)
  // ...

  // Đồng bộ law_of_light từ localStorage nếu có pending
  const lawOfLightPending = localStorage.getItem('law_of_light_accepted_pending');
  if (lawOfLightPending === 'true') {
    await supabase.from('profiles').update({
      law_of_light_accepted: true,
      law_of_light_accepted_at: new Date().toISOString()
    }).eq('id', userId);
    localStorage.removeItem('law_of_light_accepted_pending');
  }

  if (isNewUser) {
    await handleNewUserSetup(userId, hasExternalWallet);
  } else {
    // KIỂM TRA law_of_light_accepted CHO USER CŨ
    const { data: profile } = await supabase
      .from('profiles')
      .select('law_of_light_accepted')
      .eq('id', userId)
      .single();

    toast.success(t('welcomeBack'));

    if (profile?.law_of_light_accepted) {
      navigate('/');
    } else {
      navigate('/law-of-light');
    }
  }
};
```

### 2. `UnifiedAuthForm.tsx` — `handleNewUserSetup` (dòng 22-54)

Xóa đoạn check `law_of_light_accepted_pending` vì đã được di chuyển lên `handleAuthSuccess`. Sau khi setup xong, kiểm tra lại trạng thái:

```typescript
const handleNewUserSetup = async (userId: string, hasExternalWallet: boolean) => {
  setIsSettingUp(true);
  try {
    // law_of_light đã được xử lý ở handleAuthSuccess
    setSetupStep('complete');
    toast.success(t('accountSetupComplete'));
    await new Promise(resolve => setTimeout(resolve, 800));

    // Kiểm tra lại (phòng trường hợp pending chưa được lưu)
    const { data: profile } = await supabase
      .from('profiles')
      .select('law_of_light_accepted')
      .eq('id', userId)
      .single();

    if (profile?.law_of_light_accepted) {
      navigate('/');
    } else {
      navigate('/law-of-light');
    }
  } catch (error) {
    navigate('/');
  } finally {
    setIsSettingUp(false);
  }
};
```

### 3. `LawOfLightGuard.tsx` — Sửa logic SIGNED_IN (dòng 107-112)

Khi nhận event `SIGNED_IN`, reset `isAllowed` để buộc re-check từ database:

```typescript
if (event === 'SIGNED_IN' && session) {
  wasAuthenticatedRef.current = true;
  // Reset isAllowed để buộc kiểm tra lại từ database
  setIsAllowed(false);
  setIsChecking(true);
  setTimeout(() => {
    checkLawOfLightAcceptance();
  }, 150);
}
```

### 4. `LawOfLightGuard.tsx` — Thêm auto-sync pending (dòng 79-83)

Khi user đã đăng nhập nhưng `law_of_light_accepted = false`, kiểm tra localStorage để tự đồng bộ:

```typescript
if (profile && !profile.law_of_light_accepted) {
  // Tự động đồng bộ nếu có pending flag
  const pending = localStorage.getItem('law_of_light_accepted_pending');
  if (pending === 'true') {
    await supabase.from('profiles').update({
      law_of_light_accepted: true,
      law_of_light_accepted_at: new Date().toISOString()
    }).eq('id', session.user.id);
    localStorage.removeItem('law_of_light_accepted_pending');
    wasAuthenticatedRef.current = true;
    setIsAllowed(true);
    setIsChecking(false);
    return;
  }
  setIsChecking(false);
  navigate('/law-of-light', { replace: true });
  return;
}
```

## Kết quả mong đợi

- Mọi phương thức đăng nhập (OTP, ví, Google, email+password) đều kiểm tra `law_of_light_accepted` trước khi vào trang chính
- User đã đồng ý rồi → vào thẳng `/`, không hỏi lại
- User chưa đồng ý → chuyển đến `/law-of-light` để đồng ý
- Guest (không đăng nhập) → truy cập bình thường, không bị chặn
- Hard refresh → Guard kiểm tra từ database, không phụ thuộc localStorage
