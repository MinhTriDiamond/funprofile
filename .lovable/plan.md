
# Nâng Cao Trải Nghiệm Xem Ảnh Trong Chat

## Vấn de

Hiện tại, ảnh trong tin nhắn chat chỉ hiển thị dạng thu nhỏ (thumbnail) mà không thể bấm vào để phóng to xem chi tiết. Dòng 206 trong `MessageBubble.tsx` render ảnh bằng thẻ `<img>` thuần, không có `onClick` handler.

## Giải pháp

Thêm chức năng bấm vào ảnh để mở xem phóng to (fullscreen viewer) sử dụng Dialog component có sẵn.

## Chi tiết kỹ thuật

### File cần sửa: `src/modules/chat/components/MessageBubble.tsx`

1. Thêm state `selectedImage` (string | null) để theo dõi ảnh đang được xem
2. Thêm `onClick` handler và `cursor-pointer` cho thẻ `<img>` tại dòng 206
3. Thêm Dialog component hiển thị ảnh phóng to khi `selectedImage` có giá trị:
   - Nền tối (bg-black/95) để dễ xem ảnh
   - Ảnh hiển thị `object-contain` với `max-h-[90vh]` để vừa màn hình
   - Nút X để đóng
   - Bấm ngoài ảnh cũng đóng được (Dialog tự hỗ trợ)

### Import thêm:
- `Dialog, DialogContent` từ `@/components/ui/dialog`
- `X` từ `lucide-react`

### Thay đổi cụ thể:
- Dòng 206: Thêm `onClick={() => setSelectedImage(url)}` và `cursor-pointer hover:opacity-90` cho thẻ img
- Cuối component (trước return cuối): Thêm Dialog với ảnh phóng to

Chỉ sửa 1 file duy nhất, không tạo file mới.
