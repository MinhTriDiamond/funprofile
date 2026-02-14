

# Thay Video Nền Hoa Mai Bằng Video Valentine (Thiên Thần)

## Thay Đổi

Thay thế video nền hoa mai/đào bằng video Valentine mới (`vale.mp4`) và điều chỉnh CSS để hình thiên thần hiển thị rõ ràng trên cả desktop và mobile.

### Các bước thực hiện:

1. **Copy file video mới** `vale.mp4` vào `src/assets/vale.mp4`

2. **Cập nhật `src/components/ui/TetBackground.tsx`**:
   - Đổi import từ `tet-background.mp4` sang `vale.mp4`
   - Cập nhật comment mô tả cho phù hợp theme Valentine

3. **Cập nhật CSS trong `src/index.css`** -- để thiên thần hiển thị rõ:
   - **Desktop**: Đổi `object-fit` từ `cover` sang `contain` để không bị crop mất thiên thần. Thêm `object-position: center center` để thiên thần nằm giữa màn hình
   - **Mobile Portrait**: Giữ `object-fit: contain` và `object-position: center center` để thiên thần hiện đầy đủ
   - **Mobile Landscape**: Đổi sang `contain` để không bị crop

### Chi tiết kỹ thuật

| File | Thay đổi |
|------|----------|
| `src/assets/vale.mp4` | Copy file video mới vào đây |
| `src/components/ui/TetBackground.tsx` | Đổi import video sang `vale.mp4` |
| `src/index.css` | Đổi `object-fit: cover` sang `contain` cho desktop, đổi `object-position` sang `center center` cho tất cả breakpoint để thiên thần hiện rõ giữa màn hình |

### Lý do thay đổi CSS:
- Video hoa mai cũ dùng `cover` vì hoa nằm ở viền, crop không mất nội dung chính
- Video Valentine mới có hình thiên thần ở giữa, nếu dùng `cover` trên desktop rộng sẽ bị crop mất thiên thần
- Dùng `contain` sẽ giữ nguyên tỷ lệ video, hiển thị đầy đủ thiên thần, phần thừa sẽ được lấp bằng gradient nền sẵn có

