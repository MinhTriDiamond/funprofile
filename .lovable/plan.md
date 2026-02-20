
## Thêm giới hạn mint: tối thiểu 1.000 FUN & tối đa 2 lần/ngày

### Phân tích hiện trạng

Hiện tại `pplp-mint-fun` edge function chỉ kiểm tra:
- Daily FUN cap (ví dụ 500 FUN cho tier 0)
- Epoch cap toàn cầu (10M FUN/ngày)

Chưa có:
- Kiểm tra tổng FUN phải >= 1.000 để mint
- Giới hạn số lần tạo mint request trong ngày (tối đa 2 request/ngày)

---

### Các thay đổi cần thực hiện

#### 1. Edge Function `pplp-mint-fun/index.ts`

Thêm 2 kiểm tra ngay sau khi tính `totalAmount`:

**Kiểm tra tối thiểu 1.000 FUN:**
```typescript
const MIN_MINT_AMOUNT = 1000;

if (totalAmount < MIN_MINT_AMOUNT) {
  return new Response(JSON.stringify({
    error: `Cần tối thiểu ${MIN_MINT_AMOUNT} FUN để mint. Hiện tại: ${totalAmount.toFixed(0)} FUN.`,
    error_code: 'BELOW_MIN_MINT',
    current_amount: totalAmount,
    min_required: MIN_MINT_AMOUNT,
  }), { status: 400, ... });
}
```

**Kiểm tra tối đa 2 lần/ngày:**
```typescript
const MAX_DAILY_REQUESTS = 2;
const today = new Date().toISOString().split('T')[0];

const { count: todayRequestCount } = await supabase
  .from('pplp_mint_requests')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('created_at', `${today}T00:00:00.000Z`)
  .not('status', 'eq', 'failed'); // không đếm failed requests

if ((todayRequestCount ?? 0) >= MAX_DAILY_REQUESTS) {
  return new Response(JSON.stringify({
    error: `Bạn đã tạo ${MAX_DAILY_REQUESTS} yêu cầu mint hôm nay. Giới hạn tối đa ${MAX_DAILY_REQUESTS} lần/ngày.`,
    error_code: 'DAILY_REQUEST_LIMIT',
    today_count: todayRequestCount,
    max_daily: MAX_DAILY_REQUESTS,
  }), { status: 429, ... });
}
```

---

#### 2. Frontend `LightScoreDashboard.tsx`

**Disable nút Mint với tooltip/message rõ ràng:**

Nếu `totalAmount < 1000`:
- Nút bị disable
- Hiển thị text bên dưới: "Cần tối thiểu 1.000 FUN để mint (đang có X FUN)"
- Progress bar nhỏ cho thấy X/1000 FUN

Nếu `todayRequestCount >= 2`:
- Nút bị disable
- Hiển thị: "Đã đạt giới hạn 2 lần mint hôm nay"

**Cần thêm `todayRequestCount` từ `useMintHistory`:**

`useMintHistory` hiện đã fetch toàn bộ requests và lọc theo `user_id`. Cần thêm computed value:

```typescript
// Trong useMintHistory.ts:
const todayStr = new Date().toISOString().split('T')[0];
const todayRequestCount = allRequests.filter(r => 
  r.created_at.startsWith(todayStr) && r.status !== 'failed'
).length;
```

Expose `todayRequestCount` qua `UseMintHistoryResult` interface.

**Thêm UI progress bar "Tiến độ đến ngưỡng mint":**

Khi `totalAmount < 1000`, thay vì nút Mint, hiển thị:
```
[████████░░] 800/1.000 FUN (80%)
Cần thêm 200 FUN để đủ điều kiện mint
```

---

### Tổng hợp thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/pplp-mint-fun/index.ts` | Thêm check min 1.000 FUN và max 2 requests/ngày |
| `src/hooks/useMintHistory.ts` | Thêm `todayRequestCount` vào return value |
| `src/components/wallet/LightScoreDashboard.tsx` | Disable mint button với feedback rõ ràng, thêm progress bar min threshold |

---

### Luồng sau khi fix

```text
Trường hợp 1: totalAmount = 150 FUN
  → Nút Mint bị disable
  → Hiển thị: [███░░░░░░░] 150/1.000 FUN
  → "Cần thêm 850 FUN để đủ điều kiện mint"

Trường hợp 2: totalAmount = 1.200 FUN, todayCount = 2
  → Nút Mint bị disable
  → "Đã đạt giới hạn 2 lần mint hôm nay. Quay lại vào ngày mai."

Trường hợp 3: totalAmount = 1.200 FUN, todayCount = 1
  → Nút Mint bật
  → Bấm Mint → Edge function kiểm tra lại → Thành công
  → todayCount = 2 → Lần mint tiếp theo trong ngày bị block

Trường hợp 4: Edge function bị bypass (gọi trực tiếp)
  → Vẫn bị block ở tầng backend → trả error 400/429
```
