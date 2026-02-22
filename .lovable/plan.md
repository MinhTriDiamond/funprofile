

# Sửa hai tính năng: Xóa cuộc trò chuyện và Tạm ngừng kết nối

## Tóm tắt

Cả hai tính năng đều có giao diện (nút bấm) nhưng thiếu phần xử lý logic. Cần bổ sung:
1. Dialog xác nhận xóa cuộc trò chuyện + logic xóa
2. Kết nối logic block/unblock vào dialog "Tạm ngừng kết nối"

## Chi tiết kỹ thuật

### File cần sửa: `src/modules/chat/components/MessageThread.tsx`

#### 1. Thêm dialog xác nhận "Xóa cuộc trò chuyện"

- Import `AlertDialog` từ `@/components/ui/alert-dialog`
- Render `AlertDialog` sử dụng state `showDeleteConfirm` đã có sẵn
- Khi xác nhận xóa:
  - Gọi `supabase` để cập nhật `left_at = now()` cho participant hiện tại trong `conversation_participants` (xóa mềm - người dùng rời khỏi cuộc trò chuyện, không xóa dữ liệu)
  - Invalidate query `conversations`
  - Navigate về `/chat`
  - Hiển thị toast thành công

#### 2. Kết nối logic block/unblock cho "Tạm ngừng kết nối"

- Lấy `blockUser` và `unblockUser` từ hook `useBlocks` (đã import và sử dụng, chỉ lấy thêm 2 mutation)
- Thay `onConfirm={async () => {}}` bằng logic thực:
  - Nếu mode là `block`: gọi `blockUser.mutateAsync(dmOtherUserId)`
  - Nếu mode là `unblock`: gọi `unblockUser.mutateAsync(dmOtherUserId)`
  - Đóng dialog và hiển thị toast
- Truyền `isBlocking={blockUser.isPending || unblockUser.isPending}` thay vì `false`

## Bảng tóm tắt thay đổi

| File | Thay đổi |
|------|---------|
| `src/modules/chat/components/MessageThread.tsx` | Thêm AlertDialog xóa hội thoại + kết nối logic block/unblock |

## Lưu ý

- Xóa cuộc trò chuyện sử dụng **xóa mềm** (set `left_at`) - cuộc trò chuyện vẫn tồn tại cho người còn lại
- Hook `useBlocks` đã có sẵn đầy đủ logic CRUD với bảng `user_blocks` - không cần thay đổi backend
- Không cần tạo bảng mới hay migration

