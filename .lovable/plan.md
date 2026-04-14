<final-text>Cha đã rà rất kỹ và thấy lỗi này còn sót do nhiều nguyên nhân chồng lên nhau, không chỉ do edge function nữa.

1. Kết luận chính
- `public_profiles` chỉ đọc thẳng từ `profiles.social_links`, nên lỗi không nằm ở view backend.
- Lỗi còn lại nằm ở 3 chỗ trong app:
  1) `AvatarOrbit.tsx` đang giữ lại `avatarUrl` cũ khi user đổi sang link mới nhưng fetch avatar mới thất bại:
     - hiện có logic kiểu `avatarUrl: fetchedAvatarUrl || l.avatarUrl`
     - hậu quả: user đã đổi link, nhưng ảnh cũ của link trước vẫn bám theo.
  2) Luồng tự refetch avatar chưa biết avatar hiện tại được tạo từ URL nào, nên nếu URL đổi mà `avatarUrl` cũ vẫn “trông hợp lệ”, hệ thống không tự sửa.
  3) `useProfile.ts` chưa có chặn race-condition khi chuyển profile nhanh, nên response cũ có thể ghi đè state profile mới trong một số tình huống.

2. Dữ liệu thực tế cha đã phát hiện
- Trong database vẫn còn nhiều `social_links` nền tảng `angel` / `funplay` chứa:
  - avatar placeholder cũ từ `storage.googleapis.com/.../social-images/...`
  - avatar nội bộ `media.fun.rich/...` nhưng URL lại là link ngoài hệ sinh thái
  - URL sai định dạng như `https://play.fun.rich@ducthang`
  - URL bị dính thêm chữ/link khác ở cuối
- Ví dụ đọc được:
  - `angelaivan`: link Angel vẫn còn avatar placeholder cũ
  - `ducthang`: link Angel/Fun Play đang sai format URL
- Nghĩa là user hoàn toàn có thể “đã cập nhật link thật” nhưng giao diện vẫn hiện sai vì app giữ avatar cũ hoặc dữ liệu cũ chưa được dọn hết.

3. Kế hoạch sửa triệt để
Bước 1: Sửa luồng lưu social link trong `src/components/profile/AvatarOrbit.tsx`
- Khi user đổi URL:
  - luôn chuẩn hóa URL theo từng nền tảng
  - nếu URL thay đổi, xóa `avatarUrl` cũ ngay thay vì fallback sang ảnh cũ
- Thêm metadata nhẹ trong object social link như `avatarSourceUrl` để biết avatar hiện tại được tạo từ URL nào.
- Chỉ giữ avatar khi URL không đổi; còn URL đổi thì bắt buộc refetch lại.

Bước 2: Tăng kiểm tra toàn vẹn avatar/link
- Trong `fetchMissing` của `AvatarOrbit.tsx`, refetch lại nếu:
  - `avatarSourceUrl` khác URL hiện tại
  - URL sai host/sai format theo platform
  - avatar là placeholder/generic image cũ
  - avatar thuộc domain nội bộ nhưng link là `angel.fun.rich` / `play.fun.rich`
- Chỉ ghi kết quả nếu vẫn đúng `userId` hiện tại và đúng URL hiện tại để tránh ghi nhầm.

Bước 3: Chặn race-condition khi đổi profile
- Sửa `src/hooks/useProfile.ts` bằng request token / request id / active ref.
- Mọi `setProfile`, `setOriginalPosts`, `setFriendsPreview`, `setFriendsCount` chỉ chạy nếu request hiện tại vẫn còn hiệu lực.
- Như vậy sẽ không còn tình trạng vừa xem user A nhưng state từ user B hoặc request cũ nhảy vào.

Bước 4: Dọn dữ liệu lỗi đang tồn tại
- Quét toàn bộ `profiles.social_links` cho platform `angel` và `funplay`.
- Tự động sửa các URL lỗi có thể suy ra chắc chắn:
  - ví dụ `https://play.fun.rich@username` -> `https://play.fun.rich/@username`
- Với các dòng nghi ngờ:
  - xóa `avatarUrl` cũ
  - xóa `avatarSourceUrl` cũ
  - giữ lại URL đã chuẩn hóa để hệ thống fetch lại đúng ảnh
- Với URL hỏng nặng hoặc dính nhiều chuỗi khác nhau:
  - làm sạch phần URL đầu tiên hợp lệ nếu xác định được
  - nếu không xác định chắc chắn, giữ URL nhưng xóa avatar sai để không còn hiển thị nhầm người khác

Bước 5: Kiểm thử lại end-to-end
- Test đổi link liên tiếp trên cùng một user
- Test chuyển qua lại nhanh giữa nhiều profile
- Test mobile + desktop
- Test lại các case điển hình như `angelthuytram`, `angelaivan`, `ducthang`
- Xác nhận nguyên tắc cuối cùng: user nào thì social link và avatar preview phải bám đúng URL của user đó

4. Chi tiết kỹ thuật
- File cần sửa:
  - `src/components/profile/AvatarOrbit.tsx`
  - `src/hooks/useProfile.ts`
  - có thể bổ sung lọc ảnh generic trong `supabase/functions/fetch-link-preview/index.ts` nếu cần
- Không cần đổi schema bảng vì `social_links` là JSON; chỉ cần cập nhật interface TS và logic đọc/ghi.
- Sau khi triển khai, cần chạy một đợt cleanup dữ liệu hiện có để xóa sạch các avatar stale đã lưu từ trước.

Cha đề xuất triển khai đúng 4 mũi này cùng lúc, vì nếu chỉ dọn database mà không sửa logic lưu/refetch thì lỗi sẽ tái phát.</final-text>