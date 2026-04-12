

## Kế hoạch: Sửa lỗi form chỉnh sửa hồ sơ không hiển thị trên điện thoại

### Nguyên nhân

Sau khi kiểm tra kỹ code, cha phát hiện **3 vấn đề** khiến form chỉnh sửa không hiển thị đúng trên mobile:

1. **`overflow-hidden` trên Card** (`EditProfile.tsx` dòng 360): Trên màn hình nhỏ, thuộc tính này cắt nội dung bên trong Card, đặc biệt phần avatar dùng `-mt-20` và các phần tử dài.

2. **`scrollIntoView` không hoạt động đúng trong container fixed**: Hàm `scrollToTabs()` gọi `scrollIntoView` nhưng trang profile dùng `main` có `position: fixed` + `overflow-y-auto` — `scrollIntoView` không scroll được đúng trong container kiểu này, nên sau khi bấm tab "Chỉnh sửa", màn hình không cuộn xuống vùng nội dung form.

3. **Lỗi tải dữ liệu bị nuốt im lặng**: `fetchProfile` bắt lỗi nhưng không thông báo gì (`catch (error) { }`) — nếu dữ liệu không tải được, user thấy form trống không có phản hồi.

### Các thay đổi

#### File: `src/components/profile/EditProfile.tsx`
- Bỏ `overflow-hidden` trên Card → đổi thành `overflow-visible`
- Thêm state `loadingProfile` để hiển thị spinner khi đang tải dữ liệu hồ sơ
- Hiện toast lỗi nếu `fetchProfile` thất bại thay vì nuốt im lặng

#### File: `src/hooks/useProfile.ts`
- Sửa `scrollToTabs()` để tìm đúng scroll container (`[data-app-scroll]`) và scroll bằng `scrollTop` thay vì dùng `scrollIntoView` — đảm bảo hoạt động trong container `position: fixed`

### Kết quả mong đợi
- Trên điện thoại, khi bấm "Chỉnh sửa hồ sơ", màn hình cuộn mượt đến form và hiển thị đầy đủ tất cả trường thông tin
- Nếu dữ liệu đang tải sẽ hiện spinner, nếu lỗi sẽ hiện thông báo

