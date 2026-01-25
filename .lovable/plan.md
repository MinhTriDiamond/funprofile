
# Kế hoạch: Thêm tính năng căn chỉnh ảnh bìa + Nâng cấp màu sắc Profile

## Tổng quan

Con sẽ thực hiện 3 nhóm thay đổi chính:

1. **Thêm tính năng căn chỉnh ảnh bìa** (Cover Cropper) - cho phép người dùng crop/căn chỉnh ảnh bìa trước khi upload
2. **Cải thiện viền ảnh đại diện** - đổi sang màu xanh kim loại đậm sáng 
3. **Nâng cấp màu sắc HonorBoard** - đổi sang màu xanh đậm sang trọng, chữ và số đậm nét rõ ràng (không bóng)

---

## Chi tiết thực hiện

### 1. Tạo CoverCropper component mới

Tạo file `src/components/profile/CoverCropper.tsx`:
- Sử dụng thư viện `react-easy-crop` (đã có sẵn trong project)
- Cho phép crop ảnh với tỷ lệ 16:9 hoặc 3:1 (phù hợp ảnh bìa)
- Có slider zoom để phóng to/thu nhỏ
- Nút Apply và Cancel

### 2. Cập nhật CoverPhotoEditor

File: `src/components/profile/CoverPhotoEditor.tsx`

**Thay đổi:**
- Thay vì upload trực tiếp, mở CoverCropper dialog để người dùng căn chỉnh
- Sau khi crop xong mới upload lên R2

### 3. Cập nhật viền Avatar

File: `src/pages/Profile.tsx` và `src/components/profile/AvatarEditor.tsx`

**Thay đổi viền:**
- Hiện tại: `ring-4 ring-emerald-500`
- Thay đổi: Gradient xanh kim loại đậm sáng với hiệu ứng glow
- Sử dụng màu: từ `#0d4a2a` (xanh đậm) đến `#22c55e` (xanh sáng) với viền metallic

### 4. Cập nhật HonorBoard colors

File: `src/components/profile/CoverHonorBoard.tsx`

**Thay đổi:**
- Đổi từ gradient xanh lá sang **xanh dương đậm sang trọng** (navy/royal blue)
- Màu nền: `#0f172a` → `#1e3a5f` → `#0c1929` (gradient xanh navy đậm)
- Viền: vàng gold (#DAA520) giữ nguyên
- Chữ và số: **đậm nét, rõ ràng, KHÔNG BÓNG**
  - Bỏ `drop-shadow` và `text-shadow`
  - Thêm `-webkit-text-stroke: 1px` cho độ nét
  - Sử dụng font-weight: 800 (extra bold)

---

## File cần tạo/chỉnh sửa

| File | Hành động |
|------|-----------|
| `src/components/profile/CoverCropper.tsx` | Tạo mới |
| `src/components/profile/CoverPhotoEditor.tsx` | Cập nhật - thêm cropper |
| `src/components/profile/AvatarEditor.tsx` | Cập nhật - viền xanh kim loại |
| `src/pages/Profile.tsx` | Cập nhật - viền avatar |
| `src/components/profile/CoverHonorBoard.tsx` | Cập nhật - màu xanh đậm + chữ không bóng |

---

## Chi tiết kỹ thuật

### CoverCropper Component
```text
- Props: image (string), onCropComplete (blob), onCancel
- State: crop, zoom, croppedAreaPixels
- Cropper với aspect ratio 16:9 hoặc 3:1
- Slider zoom từ 1x đến 3x
- Buttons: Hủy / Áp dụng
```

### Viền Avatar mới (Xanh kim loại đậm)
```text
CSS: 
- ring với gradient: #166534 (xanh đậm) → #22c55e (xanh sáng)
- box-shadow: 0 0 15px rgba(22, 101, 52, 0.6)
- border: 4px solid với gradient metallic
```

### HonorBoard mới (Xanh navy đậm + chữ rõ nét)
```text
Background gradient:
- from: #1e3a5f (navy sáng)
- via: #0f2744 (navy trung)
- to: #0c1929 (navy đậm)

Text styling:
- Bỏ drop-shadow, text-shadow
- Font-weight: 800
- -webkit-text-stroke: 0.5px cho độ nét
- Màu vàng #FFD700 cho giá trị
- Màu champagne #E8D5A3 cho label
```

---

## Kết quả mong đợi

1. Người dùng có thể căn chỉnh/crop ảnh bìa trước khi upload
2. Ảnh đại diện có viền xanh kim loại đậm sáng sang trọng
3. HonorBoard có màu xanh navy đậm sang trọng
4. Chữ và số trong HonorBoard đậm nét, rõ ràng, không bị bóng/mờ
