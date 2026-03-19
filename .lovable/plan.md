

## Chỉnh Honor Board nằm trong ảnh bìa + Nút sửa ảnh bìa chỉ hiện icon

### Thay đổi

**File 1: `src/components/profile/ProfileHeader.tsx`**

1. **Mobile Honor Board**: Di chuyển `MobileStats` từ bên dưới ảnh bìa (dòng 100-103) vào bên trong div ảnh bìa, đặt `absolute` ở phía trên (tương tự desktop). Dùng class như `absolute z-20 block md:hidden top-2 left-2 right-2` để nằm gọn trong ảnh bìa trên mobile.

2. **Nút sửa ảnh bìa**: Giữ nguyên vị trí nút nhưng thay đổi vị trí phù hợp (ví dụ bottom-right nhỏ gọn) — không cần thay đổi ở ProfileHeader vì text nằm trong CoverPhotoEditor.

**File 2: `src/components/profile/CoverPhotoEditor.tsx`**

3. **Xóa chữ "Sửa ảnh bìa"**: Ở dòng 249, bỏ text `{isUploading ? 'Đang tải...' : 'Sửa ảnh bìa'}` và `mr-2` trên icon Camera. Chỉ giữ lại icon Camera. Nút trở thành icon-only button (dùng `size="icon"` hoặc padding nhỏ).

**File 3: `src/components/profile/CoverHonorBoard.tsx`** (MobileStats)

4. **Điều chỉnh MobileStats cho vừa trong ảnh bìa**: Giảm padding, opacity background để nhìn xuyên qua ảnh bìa (semi-transparent), đảm bảo không che hết ảnh bìa. Có thể giảm `bg-white/80` thành `bg-white/60` hoặc tương tự.

### Kết quả
- Trên mobile: Honor Board nằm overlay trong ảnh bìa (phía trên), ảnh bìa vẫn nhìn thấy xung quanh
- Nút sửa ảnh bìa chỉ hiện icon camera, không có chữ
- Desktop giữ nguyên layout hiện tại

