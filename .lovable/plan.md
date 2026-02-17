
# Sửa hoàn chỉnh: Giao dịch tặng quà không hiển thị

## Nguyên nhân gốc rễ (đã xác minh qua database)

### 1. Edge function chưa được deploy thành công
Database cho thấy `highlight_expires_at` chỉ có 15 phút (VD: 16:01 -> 16:16), trong khi code trong repo ghi 24 giờ. Ngoài ra, `user_id` trên bài gift_celebration được gán bằng **ID người nhận** thay vì người gửi. Điều này chứng tỏ phiên bản edge function đang chạy là phiên bản CŨ.

### 2. Trang cá nhân chỉ query `user_id = profileId`
Vì bài gift_celebration có `user_id = recipient_id` (do edge function cũ), người gửi không bao giờ thấy bài trên trang cá nhân của mình. Cần thêm query bài viết có `gift_sender_id = profileId`.

### 3. Dữ liệu cũ trong database cần được sửa
10+ bài gift_celebration hiện tại có `user_id` sai và `highlight_expires_at` hết hạn.

## Giải pháp

### Bước 1: Deploy lại edge function `record-donation`
Deploy lại edge function để đảm bảo:
- `user_id: body.sender_id` (bài hiện trên trang cá nhân người gửi)
- `highlight_expires_at: 24 giờ` (bài được ghim trên Feed 24h)

### Bước 2: Sửa dữ liệu cũ trong database
Cập nhật tất cả bài gift_celebration hiện có:
- Đổi `user_id` từ recipient sang sender (`gift_sender_id`)
- Gia hạn `highlight_expires_at` thêm 24 giờ từ bây giờ cho các bài trong ngày hôm nay

### Bước 3: Sửa Profile query để hiển thị bài tặng quà
Trong `src/pages/Profile.tsx`, thêm query bổ sung để lấy bài viết có `gift_sender_id = profileId` (phòng trường hợp edge function cũ đã tạo bài với user_id sai). Gộp kết quả vào danh sách bài viết hiện tại.

### Bước 4: Sửa Feed query để hiển thị bài tặng quà đúng cách
Trong `src/hooks/useFeedPosts.ts`, đảm bảo `fetchFeedPage` không lọc bỏ bài `gift_celebration` và chúng xuất hiện trong dòng thời gian thông thường (không chỉ khi được ghim).

## Chi tiết kỹ thuật

### File 1: `supabase/functions/record-donation/index.ts`
- Không thay đổi code (code đã đúng: `user_id: body.sender_id`, `24 * 60 * 60 * 1000`)
- Chỉ cần deploy lại cho đúng

### File 2: Sửa dữ liệu database (SQL UPDATE)
```text
UPDATE posts 
SET user_id = gift_sender_id,
    highlight_expires_at = NOW() + INTERVAL '24 hours'
WHERE post_type = 'gift_celebration' 
  AND user_id != gift_sender_id
  AND created_at > NOW() - INTERVAL '7 days';
```

### File 3: `src/pages/Profile.tsx` (dòng 151-161)
Thêm query bổ sung cho bài gift_celebration:
```text
// Sau query chính (dòng 161)
const { data: giftPosts } = await supabase
  .from('posts')
  .select(`*, profiles!posts_user_id_fkey (...)`)
  .eq('gift_sender_id', profileId)
  .eq('post_type', 'gift_celebration')
  .neq('user_id', profileId)  // tránh trùng lặp
  .order('created_at', { ascending: false });

// Gộp giftPosts vào combinedPosts
```

### Kết quả mong đợi

| Vấn đề | Trước | Sau |
|--------|-------|-----|
| Trang cá nhân | Không thấy bài tặng quà | Hiển thị tất cả bài tặng quà của người gửi |
| Trang chủ (Feed) | Bài bị hết hạn ghim sau 15 phút | Bài được ghim 24 giờ, sau đó hiện trong timeline |
| Lịch sử giao dịch | Dữ liệu có nhưng cần refetch | Hiển thị ngay sau khi cache invalidation |
| Tin nhắn chat | Đã có trong DB, cần refetch | Hiển thị đúng |
