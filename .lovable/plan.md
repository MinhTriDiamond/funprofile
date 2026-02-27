

# Cải tiến GIF Picker — dễ nhìn hơn

## Vấn đề hiện tại
Từ screenshot: GIF grid 2 cột quá chật, ảnh bị nén nhỏ khó nhìn. Picker chỉ rộng `w-80` (320px) và cao `max-h-96` (384px).

## Thay đổi

### 1. GifPicker.tsx — Mở rộng & cải thiện grid

- **Tăng kích thước picker**: `w-80` → `w-[360px]`, `max-h-96` → `max-h-[480px]` để có nhiều không gian hơn
- **Grid 2 cột giữ nguyên** nhưng tăng `gap-1.5` → `gap-2` để tách biệt rõ ràng hơn
- **Thêm border nhẹ** cho từng ảnh GIF (`border border-border/50`) để phân biệt GIF với nền
- **Tăng border-radius**: `rounded-lg` → `rounded-xl` cho mềm mại hơn
- **Padding grid**: `p-2` → `p-3` thoáng hơn

### 2. CommentMediaUpload.tsx — Picker container responsive

- Tăng container width: `w-80` → `w-[360px]` để khớp với picker mới
- Đảm bảo `max-w-[calc(100vw-32px)]` vẫn giữ cho mobile không tràn

## Chi tiết kỹ thuật
- 2 file thay đổi: `GifPicker.tsx`, `CommentMediaUpload.tsx`
- Không thay đổi logic, chỉ styling

