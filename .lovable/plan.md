

## Kế hoạch: Cập nhật giao diện Valentine cho production

### Nguyên nhân

Khi người dùng truy cập **fun.rich**, họ vẫn thấy giao diện hoa mai/hoa đào vì các thay đổi Valentine chưa được **publish** lên production. Tất cả chỉnh sửa (video nền, chữ Valentine, overlay) hiện chỉ có trên bản xem trước (preview).

Ngoài ra, trong mã nguồn CSS (`index.css`) vẫn còn nhiều comment và tên class đề cập "hoa mai", "hoa đào", "Tết" cần được cập nhật cho phù hợp chủ đề Valentine.

### Các bước thực hiện

**Bước 1: Dọn dẹp CSS comments trong `src/index.css`**
- Dòng 75: `/* Nền trong suốt để video hoa mai/hoa đào hiển thị */` -> cập nhật thành Valentine
- Dòng 88: `/* Facebook-style Card - Glass effect để hiển thị hoa mai/hoa đào */` -> cập nhật
- Dòng 112-116: `/* Tết Video Background */` -> đổi thành Valentine
- Dòng 136: `/* Navbar trong suốt hơn để thấy lồng đèn */` -> cập nhật
- Dòng 156: `/* Facebook Header Style - Semi-transparent để hoa mai/đào hiển thị */` -> cập nhật
- Dòng 275: comment về hoa mai/dao visibility -> cập nhật
- Dòng 620-643: Các class `.tet-card`, `.fb-card-tet`, comment "hoa mai/hoa đào" -> đổi tên/comment thành Valentine

**Bước 2: Dọn dẹp comments trong các component**
- `src/pages/Auth.tsx` dòng 90: comment hoa mai/hoa đào -> Valentine
- `src/components/auth/UnifiedAuthForm.tsx` dòng 145: comment hoa mai/hoa đào -> Valentine

**Bước 3: Publish lên production**
- Sau khi dọn dẹp xong, cần **publish** bản mới lên production để người dùng truy cập fun.rich thấy giao diện Valentine.

### Lưu ý quan trọng
- Video nền `vale.mp4` đã đúng là video Valentine
- Chữ "HAPPY VALENTINE'S DAY FROM FUN.RICH" đã được thêm
- Overlay Valentine (TetFlowerOverlay) đã cập nhật màu hồng/đỏ
- **Chỉ cần dọn comment cũ và publish** là người dùng sẽ thấy giao diện mới

