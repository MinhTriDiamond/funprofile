

# Fix: Trạng thái không cập nhật sau khi thay đổi

## Nguyên nhân
Khi bấm Đình chỉ/Cấm/Mở khóa, hệ thống cập nhật database thành công nhưng chỉ gọi `invalidateQueries` để yêu cầu tải lại dữ liệu. Vấn đề là hàm RPC `get_user_directory_summary` có thể trả về dữ liệu cũ trong vài giây, hoặc query cache chưa kịp cập nhật trước khi component render lại.

## Giải pháp
Thêm **optimistic update** -- cập nhật dữ liệu ngay trong bộ nhớ cache trước khi chờ server trả về, giúp UI phản hồi tức thì.

## Thay đổi

### File: `src/pages/Users.tsx`

Trong hàm `handleStatusAction`, sau khi thao tác thành công (trước `invalidateQueries`):

1. **Cập nhật cache ngay lập tức** bằng `queryClient.setQueryData`:
   - Với `ban`: set `is_banned = true`, `reward_status = 'banned'`
   - Với `suspend`: set `reward_status = 'on_hold'`
   - Với `unlock`: set `reward_status = 'approved'`

2. **Sau đó vẫn gọi `invalidateQueries`** để đồng bộ lại từ database (đảm bảo dữ liệu chính xác).

3. Dùng `await refetchQueries` thay vì chỉ `invalidateQueries` để buộc tải lại ngay.

### Logic cụ thể

```typescript
// Sau khi action thành công:

// 1. Optimistic update cache ngay
queryClient.setQueryData(['user-directory'], (old: any[]) => {
  if (!old) return old;
  return old.map(u => {
    if (u.id !== actionTarget.id) return u;
    if (actionTarget.type === 'ban') return { ...u, is_banned: true, reward_status: 'banned' };
    if (actionTarget.type === 'suspend') return { ...u, reward_status: 'on_hold' };
    if (actionTarget.type === 'unlock') return { ...u, reward_status: 'approved' };
    return u;
  });
});

// 2. Refetch để đồng bộ chính xác từ DB
await queryClient.refetchQueries({ queryKey: ['user-directory'] });
```

Kết quả: Ngay khi bấm xác nhận, badge trạng thái sẽ đổi màu tức thì (xanh -> cam, cam -> đỏ, v.v.) mà không cần chờ server.
