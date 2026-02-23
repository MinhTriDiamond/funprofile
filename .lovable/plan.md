
# Xoá hàng loạt tất cả user bị ban

## Mục tiêu
Thêm nút trong mục **Hệ thống (SystemTab)** để admin có thể xoá vĩnh viễn tất cả tài khoản đã bị ban (`is_banned = true`) chỉ với 1 click.

## Giải pháp

### 1. Tạo Edge Function mới: `batch-delete-banned-users`
- Xác thực admin qua JWT + bảng `user_roles`
- Truy vấn tất cả profiles có `is_banned = true`
- Lặp qua từng user, gọi lại logic xoá tuần tự giống `admin-delete-user` (xoá 34+ bảng con trước, rồi xoá profile + auth)
- Bỏ qua admin đang thao tác (không tự xoá)
- Trả về kết quả: tổng số user bị ban, số đã xoá thành công, số lỗi

### 2. Thêm UI trong SystemTab
- Thêm 1 Card mới bên dưới card "Phục hồi giao dịch bị thiếu"
- Hiển thị nút **"Xoá tất cả user bị ban"** với icon Trash2 màu đỏ
- Có dialog xác nhận trước khi xoá (tránh bấm nhầm)
- Hiển thị kết quả sau khi chạy xong (số user đã xoá, lỗi nếu có)
- Invalidate danh sách admin users sau khi xoá xong

## Chi tiết kỹ thuật

### Edge Function `batch-delete-banned-users`
```text
1. Xác thực admin (JWT + user_roles)
2. Query: SELECT id FROM profiles WHERE is_banned = true
3. Với mỗi banned user:
   a. Xoá dữ liệu từ 34+ bảng con (cùng thứ tự như admin-delete-user)
   b. Xoá profile
   c. Xoá auth user
   d. Ghi audit log
4. Trả về: { total_banned, deleted, errors[] }
```

### SystemTab UI
```text
Card mới:
  - Title: "Xoá tất cả user bị ban" (icon Trash2 đỏ)
  - Mô tả: Xoá vĩnh viễn tất cả tài khoản đã bị cấm
  - Nút: "Xoá tất cả" -> hiện AlertDialog xác nhận
  - Kết quả: Hiển thị số liệu sau khi hoàn tất
```

### Files thay đổi
1. **Tạo mới**: `supabase/functions/batch-delete-banned-users/index.ts` -- Edge function xoá hàng loạt
2. **Sửa**: `src/components/admin/SystemTab.tsx` -- Thêm card + nút xoá hàng loạt user bị ban
