

# Sửa Lỗi Trùng Lặp Tên Người Dùng Trong Sidebar Chat

## Nguyên nhân

File `src/pages/Profile.tsx` đang import hook `useConversations` từ **đường dẫn cũ** (`@/hooks/useConversations`), trong khi trang Chat sử dụng hook từ **module chat** (`@/modules/chat/hooks/useConversations`).

Hai hook này có logic tạo conversation khác nhau -- hook cũ thiếu kiểm tra block, thiếu unread count, và quan trọng nhất là khi tạo conversation từ Profile, dữ liệu trả về không đồng bộ với cache của hook mới, dẫn đến sidebar hiển thị **2 entry** cho cùng một người dùng.

## Giải pháp

Chỉ cần sửa **1 dòng** trong `src/pages/Profile.tsx`:

Thay đổi import từ:
```
import { useConversations } from '@/hooks/useConversations';
```
Sang:
```
import { useConversations } from '@/modules/chat/hooks/useConversations';
```

Điều này đảm bảo cả Profile và Chat đều dùng **cùng một hook**, chia sẻ cùng logic tạo conversation và cùng query cache, tránh trùng lặp.

## Chi tiết kỹ thuật

- File cần sửa: `src/pages/Profile.tsx` (dòng 24)
- Chỉ thay đổi đường dẫn import, không thay đổi logic
- Hook mới đã có đầy đủ: kiểm tra conversation tồn tại, kiểm tra block, unread count

