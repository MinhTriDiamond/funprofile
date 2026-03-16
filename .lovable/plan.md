

# Fix: Đồng bộ số lượng giao dịch giữa Gift Celebration và Lịch Sử Giao Dịch

## Nguyên nhân

Hai nơi đếm số lệnh khác nhau vì **2 lý do**:

1. **Khác bảng dữ liệu**: Gift Celebration đếm từ bảng `posts`, Lịch Sử Giao Dịch đếm từ bảng `donations` — hai bảng này có thể lệch nhau.

2. **Khác múi giờ**: Gift Celebration dùng giờ Việt Nam (UTC+7) để xác định "hôm nay", còn Lịch Sử Giao Dịch dùng giờ UTC. Ví dụ lúc 22:00 VN (= 15:00 UTC), "hôm nay" theo VN và UTC là cùng ngày, nhưng lúc 01:00 VN (= 18:00 UTC ngày hôm trước), hai bên sẽ đếm khác ngày.

## Giải pháp

### 1. Lịch Sử Giao Dịch — sửa "Hôm nay" dùng giờ VN
**File: `src/hooks/useAdminDonationHistory.ts`** (dòng 159-167)

Thay `new Date().toISOString().split('T')[0]` (UTC) bằng tính toán VN timezone:

```typescript
// Tính 00:00 và 23:59:59 hôm nay theo giờ VN (UTC+7)
const now = new Date();
const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
const vnDateStr = vnNow.toISOString().split('T')[0]; // YYYY-MM-DD theo VN
const startOfDayUTC = new Date(new Date(vnDateStr + 'T00:00:00+07:00').toISOString());
const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);
```

Áp dụng cho query `todayRes`:
```typescript
supabase.from('donations').select('id', { count: 'exact', head: true })
  .gte('created_at', startOfDayUTC.toISOString())
  .lt('created_at', endOfDayUTC.toISOString())
```

### 2. Gift Celebration — đếm từ bảng `donations` thay vì `posts`
**File: `src/hooks/useFeedPosts.ts`** — hàm `fetchHighlightedPosts`

Thêm một query song song đếm `donations` trong cùng khoảng thời gian VN, trả về `giftCount` chính xác từ bảng `donations` (nguồn dữ liệu chuẩn).

**File: `src/components/feed/GiftCelebrationGroup.tsx`**

Thay badge `{activePosts.length} gifts` bằng `donationCount` từ bảng donations (truyền qua props hoặc query riêng).

### 3. Tạo helper dùng chung cho VN timezone
**File: `src/lib/vnTimezone.ts`** (mới)

```typescript
export function getVNTodayRange() {
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const vnDateStr = vnNow.toISOString().split('T')[0];
  const start = new Date(Date.UTC(
    parseInt(vnDateStr.slice(0,4)),
    parseInt(vnDateStr.slice(5,7)) - 1,
    parseInt(vnDateStr.slice(8,10))
  ) - 7 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString(), dateStr: vnDateStr };
}
```

## Kết quả
- Gift Celebration và Lịch Sử Giao Dịch cùng dùng giờ VN, cùng nguồn `donations` → số liệu khớp nhau.

