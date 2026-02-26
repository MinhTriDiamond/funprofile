

# Sửa 5 lỗi logic + try-catch cho Social Interactions v2.0

## Tổng quan

Sửa 5 bug đã xác nhận: race condition reaction trên mobile, lỗi insert ShareDialog, reaction cũ trong comment, thiếu props GIF/Sticker, và dead code. Bọc tất cả DB calls trong try-catch.

## Danh sách thay đổi — 5 files

### 1. `src/components/feed/ReactionButton.tsx`
**Bug:** Mobile ghost click — `onTouchEnd` và `onClick` cùng fire `handleReaction()`.

**Sửa:**
- Trong `handleTouchEnd` (dòng 197-222): thêm `e.preventDefault()` và `e.stopPropagation()` ở đầu hàm để chặn `onClick` fire lần hai.
- Trong các reaction button bên trong popup (dòng 395 `onClick`): thêm `onTouchEnd` handler với `e.preventDefault(); e.stopPropagation()` rồi gọi `handleReactionSelect`.

### 2. `src/components/feed/ShareDialog.tsx`
**Bug:** Insert `caption` và `visibility` vào bảng `shared_posts` nhưng bảng chỉ có 4 cột: `id`, `user_id`, `original_post_id`, `created_at`.

**Sửa:**
- Dòng 102-107: Bỏ `caption` và `visibility` khỏi insert object, chỉ giữ `user_id` và `original_post_id`.
- Giữ nguyên UI caption + privacy để UX không thay đổi.
- Bọc `handleCopy` trong try-catch (clipboard API có thể fail trên một số browser).

### 3. `src/components/feed/CommentReactionButton.tsx`
**Bug:** Vẫn dùng `care` (🥰) và `pray` (🙏) thay vì chuẩn mới `sad` (😢) và `angry` (😠).

**Sửa:**
- Dòng 18: `care` → `{ type: 'sad', emoji: '😢', labelKey: 'reactionSad', color: 'text-yellow-500' }`
- Dòng 21: `pray` → `{ type: 'angry', emoji: '😠', labelKey: 'reactionAngry', color: 'text-orange-500' }`
- Bọc `fetchReactions` và `handleReaction` trong try-catch.

### 4. `src/components/feed/CommentSection.tsx`
**Bug:** `CommentMediaUpload` không nhận `onGifSelect`/`onStickerSelect` props → chọn GIF/Sticker không có tác dụng.

**Sửa:**
- Dòng 255-264: Truyền thêm 2 props:
  ```
  onGifSelect={(url) => { setMediaUrl(url); setMediaType('image'); }}
  onStickerSelect={(url) => { setMediaUrl(url); setMediaType('image'); }}
  ```
  (URL đã có prefix `g:` hoặc `s:` từ `CommentMediaUpload`)
- Cập nhật media preview để hiển thị đúng GIF/Sticker (parse prefix `g:`/`s:` khi render preview).
- Cập nhật `handleSubmit` để ghi `image_url` cho cả GIF và Sticker (vì cả hai đều lưu vào `image_url` column với prefix).

### 5. `src/components/feed/FacebookPostCard.tsx`
**Bug:** Hàm `handleShareToProfile` (dòng 272-290) là dead code — ShareDialog đã xử lý toàn bộ logic share.

**Sửa:**
- Xóa hoàn toàn hàm `handleShareToProfile` (dòng 272-290).

## Chi tiết kỹ thuật

### Race condition fix pattern
```text
handleTouchEnd:
  e.preventDefault()    ← chặn browser tạo synthetic click
  e.stopPropagation()   ← chặn event bubble lên parent
  ... logic xử lý reaction
```

### ShareDialog insert (chỉ cột hợp lệ)
```text
INSERT { user_id, original_post_id }
Bỏ: caption, visibility (bảng không có cột này)
UI giữ nguyên để user vẫn thấy tùy chỉnh
```

### CommentSection media flow
```text
User chọn GIF → CommentMediaUpload gọi onGifSelect("g:https://...") 
  → CommentSection set mediaUrl = "g:https://..." , mediaType = "image"
  → handleSubmit ghi vào image_url column
  → CommentItem parse prefix g: để render đúng
```

### try-catch coverage
Tất cả hàm async gọi database (fetchReactions, handleReaction, handleShareToProfile, handleSubmit) sẽ được bọc trong try-catch với error toast phù hợp.

