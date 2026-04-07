

## Sửa lỗi draft bài viết bị mất khi chuyển trang

### Nguyên nhân

1. **Race condition**: Khi component mount lần đầu, `content = ''` → hook auto-save thấy trống → **xóa draft ngay lập tức** trước khi restore effect kịp khôi phục
2. **Dialog không tự mở**: Draft được khôi phục vào state nhưng dialog vẫn đóng → user không thấy nội dung đã lưu

### Thay đổi

**File 1: `src/hooks/usePostDraft.ts`**
- Thêm cờ `skipNextClear` để auto-save **không xóa draft trong 1 giây đầu** sau khi mount (tránh race condition)
- Hoặc đơn giản hơn: thêm `isRestored` ref để auto-save bỏ qua lần chạy đầu tiên

**File 2: `src/components/feed/FacebookCreatePost.tsx`**
- Trong restore effect: nếu có draft với nội dung → gọi `setIsDialogOpen(true)` để tự động mở dialog
- Thêm flag `draftRestoredRef` vào auto-save để skip lần clear đầu tiên

### Chi tiết kỹ thuật

- `usePostDraftAutoSave` nhận thêm tham số `skipInitialClear: boolean` — khi `true`, lần chạy đầu tiên sẽ không gọi `clearPostDraft()` nếu content rỗng
- Restore effect: đọc draft → set state → `setIsDialogOpen(true)` → user thấy ngay bài viết đã lưu
- Flow mới: Mount → restore draft → mở dialog → auto-save bắt đầu lưu bình thường

