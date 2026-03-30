

## Thêm "Xem thêm" cho bình luận dài

### Vấn đề
Bình luận giờ cho phép tối đa 10.000 ký tự nhưng hiển thị toàn bộ, làm tràn giao diện.

### Giải pháp
Tái sử dụng pattern từ `ExpandableContent.tsx` nhưng áp dụng cho comment. Sẽ tạo component `ExpandableComment` hoặc trực tiếp dùng `ExpandableContent` trong `CommentItem.tsx`.

### Thay đổi

**File `src/components/feed/CommentItem.tsx`**
- Import `ExpandableContent` từ `./ExpandableContent`
- Thay thế đoạn render text bình luận (dòng ~163):
  ```
  // Trước:
  <p className="text-sm ..."><TwemojiText text={comment.content} /></p>
  
  // Sau: wrap trong ExpandableContent với giới hạn phù hợp cho comment
  ```
- Dùng `maxLength={300}` và `maxLines={4}` cho bình luận (ngắn hơn post vì bubble nhỏ hơn)

**Lưu ý**: `ExpandableContent` hiện dùng `linkifyText` để render. Cần đảm bảo nó cũng hỗ trợ `TwemojiText` hoặc tạo một wrapper nhỏ kết hợp cả hai. Giải pháp đơn giản nhất: dùng `ExpandableContent` trực tiếp (nó đã có linkify), bỏ `TwemojiText` wrapper cho phần text dài — hoặc tạo prop `renderText` để `ExpandableContent` có thể dùng `TwemojiText`.

### Approach chọn
Thêm prop `children` render function vào `ExpandableContent` để có thể truyền `TwemojiText` + `linkifyText` cùng lúc, giữ tính nhất quán với post content.

