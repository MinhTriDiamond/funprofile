
Mục tiêu: sửa riêng giao diện điện thoại để:
1) không còn ô nào của Honor Board bị ảnh đại diện/viên kim cương che,
2) các ô liên kết quanh avatar nằm sát avatar hơn như ảnh mẫu,
3) tên người dùng vẫn luôn đọc rõ,
4) giao diện desktop giữ nguyên.

Kế hoạch triển khai

1. Rà lại bố cục mobile của cụm hồ sơ
- Tập trung vào `src/components/profile/ProfileHeader.tsx`, `src/components/profile/CoverHonorBoard.tsx`, và `src/components/profile/AvatarOrbit.tsx`.
- Giữ cấu trúc desktop hiện tại, chỉ thêm xử lý riêng cho mobile.

2. Sửa Honor Board mobile để chừa vùng trống ở giữa phía dưới
- Trong `MobileStats` của `CoverHonorBoard.tsx`, đổi layout mobile từ lưới 2 cột đều nhau sang bố cục “2 tầng”:
  - Phần trên vẫn là header + các ô đầu tiên.
  - Phần dưới tách trái/phải và chừa một khoảng trống chính giữa cho avatar + kim cương.
- Làm board gọn theo hình chữ nhật, giảm padding/distance thừa nhưng vẫn đủ thoáng để không che ô.
- Đảm bảo tất cả 8 ô luôn nhìn thấy đủ trên màn hình nhỏ.

3. Đẩy avatar/kim cương xuống dưới board thay vì đè vào nội dung ô
- Trong `ProfileHeader.tsx`, điều chỉnh khoảng `pb` của khối mobile chứa `MobileStats` và tinh lại `-mt` của cụm avatar.
- Mục tiêu là phần avatar overlap với mép dưới của board, không overlap vào các hàng thống kê.
- Canh lại thứ tự lớp (`z-index`) để board nằm rõ, avatar nổi phía dưới, tên hiển thị sau đó không bị cấn.

4. Thu gọn quỹ đạo liên kết quanh avatar trên mobile
- Trong `AvatarOrbit.tsx`, thêm cấu hình mobile riêng cho:
  - bán kính orbit,
  - kích thước wrapper,
  - vị trí viên kim cương.
- Giảm khoảng cách icon liên kết tới avatar để sát hơn như ảnh mẫu, nhưng vẫn không chạm vào tên.
- Hạ viên kim cương xuống gần đỉnh avatar hơn để đồng bộ với bố cục mới.

5. Căn lại phần thông tin bên dưới avatar
- Giữ tên người dùng và dòng username/link ở giữa, không bị cụm orbit lấn.
- Nếu cần, giảm nhẹ scale mobile của `AvatarOrbit` hoặc tăng khoảng cách giữa avatar và phần text để cân hơn.

Chi tiết kỹ thuật
- File chính cần sửa:
  - `src/components/profile/CoverHonorBoard.tsx`
  - `src/components/profile/ProfileHeader.tsx`
  - `src/components/profile/AvatarOrbit.tsx`
- Hướng xử lý tốt nhất là thêm “mobile-only layout” thay vì tiếp tục chỉ tăng `padding-bottom`, vì việc tăng padding đơn thuần không giải quyết tận gốc vùng che khuất.
- `AvatarOrbit` hiện đang dùng hằng số cố định (`ORBIT_RADIUS`, `WRAPPER_SIZE`, vị trí diamond). Tôi sẽ tách thành thông số thích ứng cho mobile để kéo icon và kim cương vào gần avatar hơn.

Kết quả mong đợi sau khi làm
- Honor Board mobile nhìn gọn, cân, đủ 8 ô.
- Avatar và kim cương nằm phía dưới các ô, không che bất kỳ ô nào.
- Các icon liên kết bám sát avatar hơn như ảnh con gửi.
- Tên “Angel Ái Vân” và dòng bên dưới vẫn rõ, không bị chèn.