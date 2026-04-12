
Mục tiêu: xử lý dứt điểm lỗi user đăng nhập tài khoản của mình nhưng các ô liên kết lại hiện dữ liệu của `angelkim`.

Kết luận sau khi kiểm tra:
- Đây không phải lỗi hiển thị đơn thuần. Trong CSDL, hồ sơ `quyentran6868` hiện đang lưu `social_links` gần như trùng với `angelkim`.
- Luồng tạo tài khoản mới không tự gắn `social_links`.
- Trong code hiện tại, chỉ có 2 nơi ghi `social_links` vào hồ sơ:
  - `src/components/profile/AvatarOrbit.tsx`
  - `src/components/profile/EditProfile.tsx`
- Vì vậy nguyên nhân thực tế là dữ liệu social links của user đã bị ghi nhầm vào hồ sơ ở một thời điểm trước đó; giao diện chỉ đang đọc lại dữ liệu sai này.

Kế hoạch sửa:
1. Sửa dữ liệu sai hiện tại
- Reset `social_links` sai của user bị ảnh hưởng về rỗng hoặc đúng dữ liệu thực.
- Kiểm tra thêm có user nào khác bị trùng cùng một bộ link hay không để dọn luôn.

2. Chặn ghi nhầm từ `AvatarOrbit`
- Tách hẳn “icon mặc định để hiển thị” khỏi “dữ liệu thật sẽ lưu”.
- Không dùng `defaultLinks` làm dữ liệu nền để ghi xuống CSDL.
- Chỉ lưu khi user thật sự nhập/sửa/xóa link.
- Trước khi lưu, lọc bỏ link rỗng và chuẩn hóa lại dữ liệu.
- Reset sạch `localLinks` và các popup edit/prompt khi đổi `userId/profile.id` để tránh giữ state hồ sơ trước.

3. Chặn submit nhầm từ `EditProfile`
- Reset form state ngay khi đổi tài khoản trước khi tải hồ sơ mới xong.
- Khi bấm lưu, chỉ gửi `social_links` đã được làm sạch của đúng user hiện tại.
- Không gửi lại `social_links` cũ nếu user không hề chỉnh phần liên kết.

4. Thêm lớp bảo vệ cho link nội bộ
- Nếu user lưu link kiểu `fun.rich/...`, `angel.fun.rich/...`, `play.fun.rich/...` mà trỏ sang username khác với hồ sơ hiện tại, hiển thị cảnh báo/xác nhận trước khi lưu.
- Cách này sẽ chặn sớm trường hợp copy nhầm hoặc lẫn state.

5. Kiểm thử kỹ trước khi bàn giao
- Đăng nhập 2 tài khoản liên tiếp trên cùng trình duyệt.
- Mở/chỉnh sửa hồ sơ nhưng không đụng social links, xác nhận không còn bị chép link của tài khoản trước.
- Thử thêm/sửa/xóa link ở Avatar Orbit và trong form chỉnh sửa hồ sơ.
- Refresh lại trang, kiểm tra desktop và mobile.
- Soát thêm vài user ngẫu nhiên để chắc không còn lỗi lây dữ liệu.

Chi tiết kỹ thuật:
- File chính cần sửa:
  - `src/components/profile/AvatarOrbit.tsx`
  - `src/components/profile/EditProfile.tsx`
- Có thể thêm 1 migration nhỏ để lưu nhật ký thay đổi social links nếu muốn truy nguyên chính xác về sau.
- Không cần sửa logic public profile hay phân quyền đọc/ghi cho lỗi này, vì dữ liệu sai đang nằm ngay trong bản ghi hồ sơ của user.

Kết quả mong đợi:
- User đăng nhập tài khoản nào thì chỉ thấy social links của chính tài khoản đó.
- Nếu user chưa gắn link nào, hệ thống chỉ hiển thị icon mặc định mang tính giao diện, không tự ghi link của người khác vào hồ sơ.
- Các lần đổi tài khoản/đổi hồ sơ liên tiếp sẽ không còn nguy cơ lẫn social links.
