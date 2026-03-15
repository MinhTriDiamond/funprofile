

# Thêm lịch sử giao dịch 30 ngày vào Gift Celebration

## Ý tưởng

Thêm một hàng ngày (30 ngày gần nhất) vào bên dưới header của Gift Celebration Group. User nhấp vào ngày bất kỳ → load và hiển thị tất cả gift transactions trong ngày đó.

## Thiết kế UI

```text
┌─────────────────────────────────────────────┐
│ 🎁 Gift Celebration  🔊      20 gifts       │
├─────────────────────────────────────────────┤
│ 📅 Lịch sử 30 ngày                          │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐ ... ┌──┐     │
│ │15││14││13││12││11││10││09│     │14│     │
│ │T3││T2││CN││T7││T6││T5││T4│     │T2│     │
│ └──┘└──┘└──┘└──┘└──┘└──┘└──┘     └──┘     │
│  ▲ active (highlight)                        │
├─────────────────────────────────────────────┤
│ [Gift cards cho ngày được chọn]              │
└─────────────────────────────────────────────┘
```

- Hàng ngày cuộn ngang (horizontal scroll), ngày mới nhất bên trái
- Ngày có giao dịch sẽ có chấm nhỏ indicator
- Ngày được chọn highlight xanh
- Mặc định: "Hôm nay" được chọn → hiển thị gift posts hôm nay (behavior hiện tại)
- Khi chọn ngày khác → query posts từ database cho ngày đó

## Files cần tạo/sửa

### 1. Tạo `src/components/feed/GiftHistoryCalendar.tsx`
- Component hiển thị 30 ngày gần nhất dạng horizontal scroll
- Mỗi ô ngày hiển thị: số ngày + thứ viết tắt (T2-CN)
- Props: `selectedDate`, `onSelectDate`, `dateCounts` (map ngày → số gift)
- Ngày có gift → chấm indicator nhỏ bên dưới

### 2. Tạo `src/hooks/useGiftHistory.ts`
- Hook query gift_celebration posts cho ngày được chọn
- Query `posts` table: `post_type = 'gift_celebration'` + filter `created_at` theo ngày (timezone UTC+7)
- Cũng query count per day cho 30 ngày (1 query duy nhất với group by date) để hiển thị indicator

### 3. Sửa `src/components/feed/GiftCelebrationGroup.tsx`
- Thêm state `selectedDate` (default: today)
- Import và render `GiftHistoryCalendar` bên dưới header
- Khi `selectedDate` = today → dùng `posts` prop hiện tại (realtime)
- Khi `selectedDate` ≠ today → dùng data từ `useGiftHistory` hook
- Truyền posts tương ứng xuống `GiftCelebrationCard` list

## Logic query

```sql
-- Count per day (30 days)
SELECT DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as gift_date, COUNT(*) 
FROM posts 
WHERE post_type = 'gift_celebration' 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY gift_date

-- Posts for selected date
SELECT * FROM posts 
WHERE post_type = 'gift_celebration'
  AND created_at >= '2026-03-14 17:00:00Z'  -- 00:00 VN time
  AND created_at < '2026-03-15 17:00:00Z'   -- 24:00 VN time
ORDER BY created_at DESC
```

Không cần migration — chỉ query bảng `posts` hiện có.

