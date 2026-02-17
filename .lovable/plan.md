
# Sửa 3 lỗi: Bài tặng quà không hiển thị đúng

## Nguyên nhân gốc rễ

Sau khi kiểm tra kỹ database và code, Cha xác nhận:

- **Dữ liệu KHÔNG bị mất**: Giao dịch tặng quà VẪN được ghi vào bảng `donations` (10 giao dịch gần nhất đều có). Bài đăng `gift_celebration` cũng được tạo đầy đủ trên bảng `posts` với `moderation_status = approved`.

- **Vấn đề nằm ở giao diện hiển thị**, không phải backend.

### Lỗi 1: Trang cá nhân (Profile) không dùng GiftCelebrationCard

Trang Profile (dòng 836) render TẤT CẢ bài đăng bằng `FacebookPostCard`, kể cả bài `gift_celebration`. Vì `FacebookPostCard` không hiểu các trường `gift_sender_id`, `gift_recipient_id`, `gift_amount`... nên bài đăng tặng quà hiển thị trắng hoặc lỗi.

**Sửa**: Import `GiftCelebrationCard` và kiểm tra `post_type === 'gift_celebration'` trước khi render, tương tự cách Feed.tsx đã làm.

### Lỗi 2: Trang chủ (Feed) -- bài tặng quà có thể bị ẩn do stale cache

Feed.tsx đã có logic đúng (`GiftCelebrationCard` cho `gift_celebration`), nhưng hook `useFeedPosts` có `staleTime: 30s` và realtime subscription chỉ lắng nghe INSERT trên bảng `posts`. Nếu bài đăng được tạo bởi edge function (service role), realtime có thể không trigger cho user anon/auth. Thêm invalidation mạnh hơn sau khi gửi quà.

**Sửa**: Trong `UnifiedGiftSendDialog`, sau khi `recordDonationBackground` hoặc `recordMultiDonationsSequential` thành công, dispatch thêm event `invalidate-feed` để Feed refetch. Thêm listener trong `useFeedPosts`.

### Lỗi 3: Lịch sử giao dịch -- dữ liệu có nhưng cần refetch

Dữ liệu donations có trong database. Hook `useDonationHistory` đã có listener cho event `invalidate-donations`. Nhưng event này có thể không được dispatch đúng lúc nếu `recordDonationWithRetry` fail cả 2 lần. Thêm fallback invalidation.

**Sửa**: Thêm invalidation cho `donation-history` và `donation-stats` query keys trực tiếp trong `invalidateDonationCache`, không chỉ dựa vào custom event.

## Chi tiết kỹ thuật

### File 1: `src/pages/Profile.tsx`

- Import `GiftCelebrationCard` từ `@/components/feed/GiftCelebrationCard`
- Tại dòng 827-845, thêm điều kiện: nếu `item.post_type === 'gift_celebration'`, render `GiftCelebrationCard` thay vì `FacebookPostCard`

### File 2: `src/hooks/useFeedPosts.ts`

- Thêm listener cho event `invalidate-feed` (tương tự pattern `invalidate-donations` trong `useDonationHistory`)
- Khi nhận event, gọi `queryClient.invalidateQueries({ queryKey: ['feed-posts'] })` và `queryClient.invalidateQueries({ queryKey: ['highlighted-posts'] })`

### File 3: `src/components/donations/UnifiedGiftSendDialog.tsx`

- Trong hàm `invalidateDonationCache` (dòng 621-624), dispatch thêm event `invalidate-feed`
- Import `useQueryClient` và gọi trực tiếp `queryClient.invalidateQueries` cho các key: `donation-history`, `donation-stats`, `feed-posts`, `highlighted-posts`

### File 4: `supabase/functions/record-donation/index.ts`

- Redeploy edge function để đảm bảo nó đang chạy phiên bản mới nhất

## Kết quả mong đợi

| Vị trí | Trước | Sau |
|--------|-------|-----|
| Trang cá nhân | Bài tặng quà hiển thị lỗi/trắng | Hiển thị thẻ xanh GiftCelebrationCard |
| Trang chủ | Có thể không thấy bài mới ngay | Bài tặng quà xuất hiện ngay sau khi gửi |
| Lịch sử giao dịch | Có thể không cập nhật ngay | Tự động refetch sau khi ghi donation thành công |
