

# Áp dụng múi giờ Việt Nam (UTC+7) cho tất cả con số trong Fun Profile

## Vấn đề hiện tại
Nhiều nơi trong app vẫn dùng UTC hoặc giờ local server để tính "hôm nay", dẫn đến số liệu không đồng nhất. Cần sửa **tất cả** về giờ VN.

## Các file cần sửa

### Frontend (client-side)

**1. `src/components/wallet/DonationHistoryTab.tsx`** (dòng 115-118)
- Hiện tại: `new Date().toDateString()` — dùng giờ local browser
- Sửa: dùng `getTodayVN()` từ `vnTimezone.ts` và so sánh bằng cách convert `created_at` sang ngày VN

**2. `src/hooks/useEpochAllocation.ts`** (dòng 76-79)
- Hiện tại: `now.toISOString().slice(0, 7)` và `now.getFullYear(), now.getMonth()` — dùng UTC
- Sửa: tính tháng epoch theo VN timezone

### Edge Functions (server-side)

**3. `supabase/functions/pplp-evaluate/index.ts`** (dòng 226, 418-419)
- Daily cap check: `new Date().toISOString().split('T')[0]` → UTC
- Streak update: `todayDate` và `yesterday` cũng dùng UTC
- Sửa: thêm helper VN offset, tính `today` và `yesterday` theo giờ VN

**4. `supabase/functions/pplp-get-score/index.ts`** (dòng 58)
- Epoch date: `new Date().toISOString().split('T')[0]` → UTC
- Sửa: tính ngày VN

**5. `supabase/functions/create-post/index.ts`** (dòng 84-85)
- Spam check: `today.setHours(0, 0, 0, 0)` → server local time (có thể là UTC)
- Sửa: dùng VN midnight

**6. `supabase/functions/daily-fraud-scan/index.ts`** (dòng 162 và tương tự)
- Fraud scan: `today.setHours(0, 0, 0, 0)` → server local
- Sửa: dùng VN midnight

### Cách tiếp cận chung

Tất cả edge functions sẽ dùng cùng pattern helper:
```typescript
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const nowVN = new Date(Date.now() + VN_OFFSET_MS);
const todayVN = `${nowVN.getUTCFullYear()}-${String(nowVN.getUTCMonth()+1).padStart(2,'0')}-${String(nowVN.getUTCDate()).padStart(2,'0')}`;
const todayStartUTC = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate()) - VN_OFFSET_MS);
```

Frontend sẽ import từ `src/lib/vnTimezone.ts` đã có sẵn.

## Tổng cộng: 6 files cần sửa
- 2 file frontend
- 4 file edge functions

