

## Tích hợp Facebook Composer UX: Clipboard Paste, Drag-Drop, Image Editor

### Phân tích hiện trạng

Dự án **đã có** hệ thống composer (`src/components/feed/FacebookCreatePost.tsx`) sử dụng `UploadQueue` + `CreatePostMediaManager`. Bundle mới muốn thay thế bằng hệ thống **DraftAttachment** hỗ trợ paste ảnh Ctrl+V, drag-drop, image editor, và lưu vào bảng `post_attachments`.

**Khác biệt quan trọng:**
- Composer hiện tại: `UploadQueue` (upload ngay khi chọn file) → Composer mới: `DraftAttachment` (giữ local, upload khi submit)
- PostCard hiện tại: đã được tách thành `PostHeader`, `PostMedia`, `PostFooter` (tốt hơn bundle) → **giữ nguyên**
- Edge function hiện tại: có duplicate detection, low-quality filter, rate limit → **giữ nguyên + thêm attachments**
- `useFeedPosts` hiện tại: đã hoạt động tốt → **chỉ thêm join post_attachments**

### Kế hoạch — Tích hợp có chọn lọc (không thay thế toàn bộ)

#### 1. Database Migration — Tạo bảng `post_attachments`
Chạy migration SQL từ bundle để tạo bảng với RLS policies.

#### 2. Cài dependencies mới
```
react-filerobot-image-editor, styled-components, react-konva, konva
```

#### 3. Tạo module types — `src/modules/feed/types/index.ts`
Chứa `DraftAttachment`, `PostAttachment`, và các types dùng chung. Giữ lại types hiện có trong `src/components/feed/types.ts`.

#### 4. Tạo components mới (3 files)
- `src/modules/feed/components/post/AttachmentPreviewGrid.tsx` — Grid preview với edit/remove/reorder
- `src/modules/feed/components/post/ImageEditorModal.tsx` — Lazy-load Filerobot editor với crop, rotate, text, alt text

#### 5. Nâng cấp FacebookCreatePost — Thêm paste + drag-drop + attachments
Sửa `src/components/feed/FacebookCreatePost.tsx` hiện tại để:
- Thêm `DraftAttachment[]` state thay thế `UploadQueue` cho images
- Thêm `onPasteCapture` handler trên dialog content → paste ảnh từ clipboard
- Thêm `onDragOver/onDragLeave/onDrop` handlers → drag-drop files
- Tích hợp `AttachmentPreviewGrid` + `ImageEditorModal`
- Khi submit: compress + upload images → build `AttachmentPayload[]` → gửi trong body
- Giữ nguyên video upload qua Uppy (không đổi)
- Giữ nguyên guest mode, limited account, feeling, location, friend tag

#### 6. Cập nhật Edge Function `create-post/index.ts`
- Thêm `AttachmentInput` interface
- Parse `attachments` array từ request body
- Insert vào `post_attachments` sau khi tạo post
- Giữ nguyên duplicate detection, rate limit, low-quality filter

#### 7. Cập nhật `useFeedPosts.ts`
- Sau khi fetch posts, query `post_attachments` theo `post_id` IN (...)
- Map attachments vào mỗi post object
- Giữ nguyên cursor pagination + realtime

#### 8. Cập nhật `EditPostDialog`
- Hỗ trợ hiển thị và xóa attachments khi edit
- Đồng bộ `post_attachments` khi save

#### 9. PostCard — Không thay thế
Giữ nguyên `src/components/feed/FacebookPostCard.tsx` hiện tại (đã tách component tốt). Chỉ cần `PostMedia` đã hỗ trợ `media_urls` array → attachments sẽ được map thành `media_urls` format tương thích.

### Tổng kết files thay đổi

| File | Action |
|------|--------|
| DB migration `post_attachments` | Tạo mới |
| `src/modules/feed/types/index.ts` | Tạo mới |
| `src/modules/feed/components/post/AttachmentPreviewGrid.tsx` | Tạo mới |
| `src/modules/feed/components/post/ImageEditorModal.tsx` | Tạo mới |
| `src/components/feed/FacebookCreatePost.tsx` | Sửa lớn |
| `src/hooks/useCreatePost.ts` | Sửa (thêm attachments flow) |
| `src/hooks/useFeedPosts.ts` | Sửa (join post_attachments) |
| `src/components/feed/EditPostDialog.tsx` | Sửa (sync attachments) |
| `supabase/functions/create-post/index.ts` | Sửa (insert attachments) |

