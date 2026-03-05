

# Sửa lỗ hổng bảo mật: thêm `pending` và `banned` vào blockedStatuses server-side

## Vấn đề

Trong `supabase/functions/claim-reward/index.ts` dòng 360-361:
```typescript
const blockedStatuses = ['on_hold', 'rejected'];
```

Thiếu `pending` và `banned`. User có thể bypass UI bằng cách gọi API trực tiếp khi `reward_status = 'pending'` hoặc `'banned'`.

## Giải pháp

Sửa 1 dòng trong `supabase/functions/claim-reward/index.ts`:

**Dòng 360**: Thêm `'pending'` và `'banned'` vào mảng `blockedStatuses`:
```typescript
const blockedStatuses = ['pending', 'on_hold', 'rejected', 'banned'];
```

**Dòng 362-365**: Thêm message cho `pending` và `banned`:
```typescript
const statusMessages = {
  pending: 'Tài khoản đang chờ Admin xét duyệt trước khi claim.',
  on_hold: 'Phần thưởng đang bị treo. Vui lòng liên hệ Admin.',
  rejected: 'Phần thưởng đã bị từ chối. Vui lòng liên hệ Admin.',
  banned: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.',
};
```

Sửa 1 chỗ, deploy lại edge function.

