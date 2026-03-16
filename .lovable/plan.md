

# Fix: Gift celebrations không hiển thị — biến `startOfDayVN` không tồn tại

## Nguyên nhân
Trong `src/hooks/useFeedPosts.ts`, hàm `fetchHighlightedPosts` (dòng 183-208) khai báo `twentyFourHoursAgo` nhưng lại sử dụng `startOfDayVN.toISOString()` ở dòng 191 — biến này **không được định nghĩa**, gây ra `ReferenceError` và khiến toàn bộ gift celebration không load được.

## Sửa lỗi

### `src/hooks/useFeedPosts.ts` — dòng 183-193
- Thay thế `now` và `twentyFourHoursAgo` bằng tính toán đúng `startOfDayVN` (00:00 giờ Việt Nam = UTC-7h):

```typescript
const fetchHighlightedPosts = async (): Promise<FeedPost[]> => {
  // Tính 00:00 hôm nay theo giờ VN (UTC+7)
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const startOfDayVN = new Date(Date.UTC(
    vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()
  ) - 7 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('posts')
    .select(...)
    .eq('post_type', 'gift_celebration')
    .gte('created_at', startOfDayVN.toISOString())  // Giờ đã đúng
    ...
```

## Kết quả
- `startOfDayVN` được định nghĩa đúng → không còn ReferenceError
- Gift celebration hiển thị lại bình thường trên cả desktop và mobile

