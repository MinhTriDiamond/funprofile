
## Vấn đề
Sau fix vừa rồi, khi user dán link xã hội của mình vào ô input rồi bấm "Thêm", có thể link không được lưu vì:
- `canWrite` check yêu cầu `userId === authUserId && isOwner`. Nếu một trong các props chưa kịp đồng bộ (ví dụ `isOwner` còn false do component cha chưa render xong), thao tác bị block âm thầm.
- User không thấy thông báo gì → tưởng "lỗi giao diện".

## Hướng xử lý (chỉ sửa `src/components/profile/AvatarOrbit.tsx`)

### 1. Hiện feedback khi block
Khi `persistLinks` bị chặn (cross-user hoặc chưa đăng nhập), hiện `toast.error("Không thể lưu — vui lòng tải lại trang")` thay vì im lặng.

### 2. Nới `canWrite` đúng mức
Giữ guard chính `userId === authUserId` (chống ghi nhầm user), nhưng **bỏ phụ thuộc `isOwner`** trong `canWrite` cho thao tác user tự thêm link của chính mình. Vì:
- `isOwner` là prop từ component cha, có thể chưa kịp truyền xuống.
- `authUserId === userId` đã đủ đảm bảo "user đang thao tác trên hồ sơ của chính họ".
- `isOwner` chỉ cần cho việc hiện UI nút Edit, không cần cho điều kiện ghi DB.

### 3. Loading state khi đang lưu
Thêm `isSaving` state → disable nút "Thêm" + hiện spinner khi `persistLinks` đang chạy → user biết hệ thống đang xử lý, không bấm lại nhiều lần gây race.

### 4. Toast thành công
Sau khi lưu thành công thêm/xoá link, hiện `toast.success("Đã cập nhật mạng xã hội")`.

### 5. Reset input sau khi lưu
Sau khi `persistLinks` resolve thành công, đảm bảo input URL được clear (đã có trong `SocialLinksEditor` nhưng kiểm tra lại flow async).

## Phạm vi
- Chỉ sửa `src/components/profile/AvatarOrbit.tsx` (logic `canWrite`, `persistLinks`, thêm toast + loading).
- Không đụng `SocialLinksEditor.tsx` (UI input đã ổn).
- Không đụng schema/RLS.
