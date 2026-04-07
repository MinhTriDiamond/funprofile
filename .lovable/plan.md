

## Kế hoạch sửa 2 vấn đề

### Vấn đề 1: Bài viết dang dở bị mất khi chuyển trang

**Nguyên nhân**: Nội dung bài viết (`content`, `privacy`, `feeling`, `location`, `taggedFriends`) chỉ lưu trong React state — khi chuyển trang, component bị unmount và mất hết dữ liệu.

**Giải pháp**: Lưu draft vào `sessionStorage` (tự xóa khi đóng tab).

| File | Thay đổi |
|------|----------|
| `src/hooks/usePostDraft.ts` | **Mới** — Hook lưu/đọc draft từ sessionStorage (content, privacy, feeling, location, taggedFriends) với debounce 500ms |
| `src/components/feed/FacebookCreatePost.tsx` | Dùng `usePostDraft` để khôi phục state khi mount, lưu khi thay đổi, xóa khi đăng thành công |

Chi tiết:
- Lưu text content + privacy + feeling + location + tagged friends vào `sessionStorage` key `draft_post`
- Mỗi khi `content`, `privacy`, `feeling`, `location`, `taggedFriends` thay đổi → debounce 500ms → ghi sessionStorage
- Khi component mount → đọc từ sessionStorage → khôi phục state
- Khi đăng bài thành công hoặc user đóng dialog không có nội dung → xóa draft
- **Không lưu ảnh/video** vì blob URL không persist được (chỉ lưu text data)
- Khi có draft cũ và user mở dialog → tự động mở dialog với nội dung đã lưu

### Vấn đề 2: Chỉ đăng được 1 hình ảnh

**Phân tích**: Code frontend đã hỗ trợ tối đa 12 ảnh (`MAX_ATTACHMENTS = 12`), input có `multiple`, edge function không giới hạn. Cần kiểm tra thêm — nhưng có thể do user chưa biết cách thêm nhiều ảnh (cần chọn nhiều file cùng lúc trong file picker).

**Giải pháp**: Cải thiện UX để rõ ràng hơn:
- Thêm nút "Thêm ảnh" rõ ràng bên trong grid preview khi đã có ảnh
- Hiển thị counter "X/12 ảnh" để user biết có thể thêm nhiều hơn
- Đảm bảo nút thêm ảnh trong `AttachmentPreviewGrid` hoạt động đúng

| File | Thay đổi |
|------|----------|
| `src/components/feed/FacebookCreatePost.tsx` | Thêm nút "Thêm ảnh" khi đã có attachments, hiển thị counter |

### Tóm tắt file thay đổi

| File | Loại |
|------|------|
| `src/hooks/usePostDraft.ts` | Mới |
| `src/components/feed/FacebookCreatePost.tsx` | Sửa |

