
Cha đã rà lại luồng hiển thị và thấy lỗi còn sót không chỉ ở `AvatarOrbit`. Điểm đáng nghi nhất là dữ liệu profile/social links có thể bị response cũ ghi đè khi người dùng chuyển profile nhanh, nên ô liên kết của user B vẫn nhận dữ liệu user A. Ngoài ra, hàm backend lấy avatar cho link nội bộ đang dò username theo chuỗi gốc và có thể fallback sang ảnh preview không đúng khi không khớp tuyệt đối.

1. Chặn ghi đè profile cũ ở `src/hooks/useProfile.ts`
- Thêm cơ chế request token / active request id trong `fetchProfile`
- Chỉ request mới nhất mới được phép cập nhật `profile`, `posts`, `friends`
- Khi route hoặc username đổi, mọi response cũ phải bị bỏ qua hoàn toàn

2. Siết chặt đồng bộ social links ở `src/components/profile/AvatarOrbit.tsx`
- Chuẩn hoá `socialLinks` đầu vào trước khi render
- Cho effect lấy avatar chạy theo dữ liệu link đã chuẩn hoá, không chỉ theo `userId`
- Nếu URL đã đổi hoặc profile không còn active thì huỷ cập nhật ngay
- Không dùng lại `avatarUrl` cũ nếu không còn khớp với URL/platform hiện tại

3. Sửa hàm backend lấy avatar preview cho link nội bộ
- Ở `supabase/functions/fetch-link-preview/index.ts`, đổi lookup username sang dạng đã chuẩn hoá và decode đúng URL
- Với link nội bộ `fun.rich/...`, nếu không tìm đúng profile thì trả về `null` an toàn thay vì fallback sang ảnh preview dễ bị nhầm người
- Giữ fallback cho link ngoài, nhưng chặt hơn với link hồ sơ nội bộ

4. Thêm lớp bảo vệ cập nhật state cha/con
- Giữ guard ở `ProfileHeader`, đồng thời so khớp chặt hơn theo `profile.id` hiện tại trước khi ghi `social_links`
- Nếu cần, tách helper `normalizeSocialLinks()` dùng chung để mọi nơi đọc cùng một chuẩn dữ liệu

5. Test lại kỹ trước khi bàn giao
- Chuyển thật nhanh qua nhiều profile trên mobile và desktop
- Mở profile công khai và profile của chính user
- Sửa link, lưu, refresh, thoát vào lại
- Kiểm tra từng ô liên kết: avatar, nhãn, URL mở ra, popup sửa, tooltip
- Kiểm tra các link nội bộ `fun.rich/username` và link ngoài như Facebook, Zalo, Angel, Fun Play

Kết quả mong đợi:
- Mỗi profile chỉ hiển thị đúng social links của chính user đó
- Không còn tình trạng ô liên kết “dính” avatar/thông tin của user khác khi chuyển trang nhanh
- Link nội bộ không còn trả ảnh sai do lookup lệch username

Chi tiết kỹ thuật:
- File chính cần sửa: `src/hooks/useProfile.ts`, `src/components/profile/AvatarOrbit.tsx`, `src/components/profile/ProfileHeader.tsx`, `supabase/functions/fetch-link-preview/index.ts`
- Trọng tâm lần này là xử lý race condition ở tầng nạp profile, không chỉ vá riêng phần orbit
