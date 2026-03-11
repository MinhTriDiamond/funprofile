

## Kiểm tra lỗi: Image Editor + Video Upload

### 1. Lỗi Image Editor (LỖI NGHIÊM TRỌNG)

Console log cho thấy lỗi rõ ràng:

```
react-konva version 19 is only compatible with React 19.
Make sure to have the last version of react-konva and react
or downgrade react-konva to version 18.
```

**Nguyên nhân**: `react-filerobot-image-editor` phụ thuộc vào `react-konva` v19, nhưng dự án dùng React 18. Khi mở editor, module load thất bại và hiển thị "Đang tải trình chỉnh sửa..." mãi mãi.

**Giải pháp**: Thay thế `react-filerobot-image-editor` bằng editor canvas thuần (không cần react-konva). Tự xây dựng editor đơn giản hỗ trợ:
- **Crop**: Dùng `react-easy-crop` (đã có trong dependencies)
- **Rotate**: Canvas API xoay 90/180/270 độ
- **Alt Text**: Giữ nguyên input hiện tại
- Bỏ dependency `react-filerobot-image-editor`, `react-konva`, `konva`

### 2. Video Upload (HOẠT ĐỘNG BÌNH THƯỜNG)

Nhìn screenshot, nút "Uploading video..." hiển thị khi video đang upload — đây là hành vi đúng. Component `VideoUploaderUppy` upload qua presigned URL lên R2 với progress tracking. Không có lỗi nào trong console hay network requests liên quan đến video.

Tuy nhiên, có một vấn đề nhỏ: khi video upload xong, nút submit vẫn bị disable nếu `isVideoUploading` chưa reset đúng timing. Kiểm tra và đảm bảo state sync chính xác.

### Files thay đổi

| File | Action |
|------|--------|
| `src/modules/feed/components/post/ImageEditorModal.tsx` | Viết lại — dùng `react-easy-crop` + Canvas API |
| `package.json` | Xóa `react-filerobot-image-editor`, `react-konva`, `konva` |

### Chi tiết kỹ thuật — ImageEditorModal mới

- **Crop tab**: Dùng `react-easy-crop` (đã cài sẵn) với aspect ratio presets (1:1, 4:3, 16:9, free)
- **Rotate tab**: 4 nút xoay (0°, 90°, 180°, 270°) render qua canvas
- **Alt Text tab**: Giữ nguyên UI hiện tại
- **Save**: Canvas API tạo file mới từ crop area + rotation, output WebP/PNG
- Không cần cài thêm dependency mới

