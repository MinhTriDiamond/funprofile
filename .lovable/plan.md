
# Fix Social Links - Thêm/Xóa/Kéo thả không hoạt động

## Nguyên nhân gốc

Hiện tại `social_links` trong database của tài khoản `angelaivan` là mảng rỗng `[]`. Khi mảng rỗng, component `AvatarOrbit` hiển thị 9 icon mặc định (defaultLinks) để giao diện trông đẹp. Tuy nhiên, khi con nhấn vào icon để sửa/xóa/kéo, code thao tác trên mảng `localLinks` (vẫn là `[]` rỗng), không phải trên `defaultLinks` đang hiển thị.

Cụ thể:
- **Thêm link (pencil trên icon mặc định)**: Gọi `savePromptLink` -> map qua `localLinks` (rỗng) -> không tìm thấy platform -> lưu mảng rỗng
- **Xóa link**: Gọi `removeLink` -> filter mảng rỗng -> không có gì thay đổi  
- **Kéo thả**: Thao tác trên mảng rỗng -> không hiệu lực

## Giải pháp

Sửa file `src/components/profile/AvatarOrbit.tsx`:

1. Khi owner nhấn vào icon mặc định (empty slot) để thêm URL, khởi tạo `localLinks` từ `defaultLinks` trước khi thao tác
2. Cập nhật hàm `savePromptLink` để xử lý trường hợp platform chưa có trong `localLinks` (thêm mới thay vì chỉ map)
3. Cập nhật drag-to-reorder để dùng `displayLinks` thay vì `localLinks` khi `localLinks` rỗng

## Chi tiết kỹ thuật

**File: `src/components/profile/AvatarOrbit.tsx`**

- Trong `savePromptLink`: Nếu platform không tồn tại trong `localLinks`, tạo entry mới từ PLATFORM_PRESETS rồi thêm vào mảng (giống logic `saveLink` với `isNew=true`)
- Trong `removeLink`: Nếu `localLinks` rỗng nhưng đang hiển thị defaultLinks, không cần xóa vì link chưa được lưu
- Trong `handleDragStart`/`handleDragOver`/`handleDragEnd`: Khi `localLinks` rỗng, khởi tạo từ `displayLinks` (defaultLinks) trước khi cho phép kéo thả, sau đó lưu thứ tự mới vào DB
- Cập nhật `handlePickPlatform` (nút +): Khi chọn platform đã có trong defaultLinks nhưng chưa có trong localLinks, xử lý đúng

Thay doi chi co 1 file frontend, khong thay doi database.
