

# Hiển thị tất cả lệnh gift trong 24h (giờ Việt Nam), mới nhất lên đầu

## Vấn đề
Hiện tại `fetchHighlightedPosts` lọc theo `.eq('is_highlighted', true)` và điều kiện `highlight_expires_at` → chỉ hiện những gift đã được đánh dấu highlighted, bỏ sót các lệnh chuyển tặng khác.

## Giải pháp — `src/hooks/useFeedPosts.ts`

Sửa hàm `fetchHighlightedPosts`:

1. **Bỏ filter `is_highlighted`** và `highlight_expires_at` — thay bằng filter `post_type = gift_celebration`
2. **Tính 24h theo giờ Việt Nam (UTC+7)**: Lấy đầu ngày hôm nay theo múi giờ VN làm mốc thay vì 24h trượt
3. **Sắp xếp mới nhất lên đầu**: Giữ `order('created_at', { ascending: false })`
4. **Bỏ limit 200** (hoặc nâng lên 500) để đảm bảo lấy hết tất cả lệnh trong ngày

```text
Trước:  .eq('is_highlighted', true)
        .or('highlight_expires_at.gt...') 
        .gte('created_at', twentyFourHoursAgo)

Sau:    .eq('post_type', 'gift_celebration')
        .gte('created_at', startOfDayVN)   // 00:00 giờ VN = 17:00 UTC hôm trước
```

Không cần sửa component — `GiftCelebrationGroup` đã sort mới nhất lên đầu và hiển thị đúng tổng số.

