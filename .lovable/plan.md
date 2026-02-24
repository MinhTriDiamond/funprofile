

# Fix: Lỗi xoá tài khoản do thiếu dọn dẹp bảng `light_actions`

## Nguyên nhân

Khi xoá tài khoản, hệ thống báo lỗi vì bảng `light_actions` có cột `actor_id` tham chiếu (foreign key) đến bảng `profiles`. Hàm xoá chỉ dọn dẹp `light_actions.user_id` mà **bỏ sót** `light_actions.actor_id`, dẫn đến lỗi ràng buộc khoá ngoại khi xoá profile.

Ngoài ra, hàm tự xoá tài khoản (`delete-user-account`) cũng thiếu rất nhiều bảng so với hàm admin.

## Giải pháp

### 1. Cập nhật `admin-delete-user/index.ts`
- Thêm dòng xoá `light_actions.actor_id` (hiện chỉ có `light_actions.user_id`)
- Thêm xoá `username_history` (bảng mới từ Bài 6)

### 2. Cập nhật `delete-user-account/index.ts`  
- Thêm tất cả các bảng còn thiếu cho nhất quán với hàm admin, bao gồm:
  - `light_actions` (cả `user_id` và `actor_id`)
  - `light_reputation`
  - `fun_distribution_logs`
  - `username_history`
  - `comment_likes`, `message_reactions`, `message_reads`, `live_reactions`
  - Và các bảng khác đã có trong hàm admin

### Chi tiết kỹ thuật

Lỗi cụ thể trong Postgres logs:
```
update or delete on table "profiles" violates foreign key constraint 
"light_actions_actor_id_fkey" on table "light_actions"
```

Dòng cần thêm trong cả 2 function:
```typescript
{ table: 'light_actions', column: 'actor_id' },  // <-- THIẾU
```

