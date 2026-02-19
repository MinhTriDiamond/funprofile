
## Chỉnh sửa bố cục Avatar trên trang Profile (Mobile)

### Vấn đề hiện tại
Trên điện thoại, avatar bị "chìm" hoàn toàn vào trong ảnh bìa vì:
- Ảnh bìa chỉ cao 155px trên mobile
- Avatar có negative margin `-mt-[193px]` kéo nó lên quá cao
- Kết hợp với AvatarOrbit wrapper 486px, avatar bị nuốt vào ảnh bìa

### Giải pháp
Điều chỉnh lại các thông số để avatar nhô ra khỏi ảnh bìa đúng kiểu Facebook (nửa trên nằm trong cover, nửa dưới nhô xuống phần thông tin):

**File: `src/pages/Profile.tsx`**

1. **Tăng chiều cao ảnh bìa trên mobile** từ `h-[155px]` lên `h-[200px]` để có nhiều không gian hơn cho Honor Board và avatar.

2. **Điều chỉnh negative margin của avatar** cho phù hợp với chiều cao mới:
   - Mobile: `-mt-[120px]` (thay vì `-mt-[193px]`) -- avatar nhô xuống khoảng nửa
   - SM: `-mt-[130px]` (thay vì `-mt-[201px]`)
   - MD: giữ nguyên `-mt-[217px]` vì desktop đang đẹp

3. **Điều chỉnh vị trí Mobile Honor Board** phù hợp chiều cao cover mới.

### Kết quả mong đợi
- Avatar sẽ nhô ra khỏi ảnh bìa giống hình mẫu desktop (nửa trên trong cover, nửa dưới bên ngoài)
- Honor Board vẫn hiển thị gọn trong ảnh bìa
- Desktop giữ nguyên không thay đổi
