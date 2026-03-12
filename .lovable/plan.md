

## Lỗi Video Trùng Lặp — Nguyên nhân & Sửa lỗi

### Nguyên nhân

Trong `VideoUploaderUppy.tsx`, useEffect upload (line 164) có `onUploadComplete` trong dependency array (line 333). Khi callback `handleVideoUploadComplete` thay đổi reference (do phụ thuộc `attachments.length`), effect có thể re-trigger. Kết hợp với React StrictMode (chạy effect 2 lần trong dev), nếu video upload nhanh (file nhỏ hoặc mạng tốt), cả 2 lần effect đều hoàn thành XHR và gọi `onUploadComplete` → thêm 2 DraftAttachment video trùng nhau.

### Sửa lỗi (2 files)

**File 1: `src/components/feed/VideoUploaderUppy.tsx`**
- Lưu `onUploadComplete`, `onUploadError`, `onUploadStart` vào ref thay vì dùng trực tiếp trong useEffect
- Xóa callbacks khỏi dependency array của upload useEffect
- Đây là pattern chuẩn React để tránh effect re-run khi callback thay đổi reference

**File 2: `src/components/feed/FacebookCreatePost.tsx`**
- Thêm guard trong `handleVideoUploadComplete`: kiểm tra nếu đã có video trong attachments thì không thêm nữa
- Xóa `attachments.length` khỏi dependency của `handleVideoUploadComplete` (dùng functional update `setAttachments(current => ...)` thay vì đọc `attachments.length`)

### Chi tiết kỹ thuật

```text
VideoUploaderUppy:
  BEFORE: useEffect deps = [selectedFile, onUploadComplete, onUploadError, onUploadStart]
  AFTER:  useEffect deps = [selectedFile]
          + onUploadCompleteRef, onUploadErrorRef, onUploadStartRef (synced via useEffect)

FacebookCreatePost handleVideoUploadComplete:
  BEFORE: deps = [attachments.length]  →  sortOrder: attachments.length
  AFTER:  deps = []  →  setAttachments(current => {
            if (current.some(a => a.kind === 'video')) return current; // guard
            return reorderAttachments([...current, videoDraft]);
          })
```

