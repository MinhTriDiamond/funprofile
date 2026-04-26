# 🎯 Mục tiêu

Loại bỏ giá hardcode trong dashboard "Tổng tặng/nhận toàn hệ thống" (Honor Board) và thay bằng **giá real-time** từ CoinGecko (đã có sẵn trong hệ thống qua edge function `token-prices`).

---

# 🔍 Nguyên nhân hiện tại (đã rà soát)

Hai hàm SQL `get_app_stats()` và `get_global_gift_breakdown()` đang **hardcode bảng giá** trong PL/pgSQL:

```sql
('BTC', 95000.0), ('BTCB', 95000.0)
('ETH', 3500.0)
('BNB', 600.0)
('CAMLY', 0.001)   -- ❌ sai, giá thực ~0.000014
-- FUN không có trong bảng → luôn $0
```

**Hệ quả**:
- BTC = 11 × 95.000 = **$1.045M** (giá thật ~$95k–$110k tuỳ thời điểm → cần cập nhật)
- CAMLY = 31.214.820.871 × 0,001 = **$31.21M** (sai gấp ~71 lần so với giá thật ~$0.000014 → đúng phải ~$437K)
- FUN = 6.257.494 × 0 = **$0** (không có trong bảng giá)
- Tổng $32.45M / $46.73M đang bị **thổi phồng** chủ yếu do CAMLY hardcode quá cao.

---

# 🛠 Giải pháp 2 lớp

## Lớp 1 — Refactor SQL function nhận giá từ ngoài vào

Sửa `get_app_stats()` và `get_global_gift_breakdown()` để **nhận tham số `p_prices JSONB`** thay vì hardcode VALUES:

```sql
-- Ví dụ:
get_app_stats(p_prices JSONB DEFAULT NULL)
get_global_gift_breakdown(p_direction TEXT, p_prices JSONB DEFAULT NULL)

-- Bên trong:
WITH price_of AS (
  SELECT key AS sym, (value)::numeric AS price
  FROM jsonb_each_text(COALESCE(p_prices, '{}'::jsonb))
)
```

Khi `p_prices = NULL` → fallback về bảng cũ (giữ tính tương thích ngược cho các caller chưa nâng cấp).

## Lớp 2 — Frontend lấy giá rồi truyền vào RPC

Sửa `AppHonorBoard.tsx` và `GlobalGiftStatsModal.tsx`:

1. Dùng hook **`useTokenPrices()`** đã có sẵn (CoinGecko cache 5 phút, refetch mỗi 5 phút — đáp ứng yêu cầu "auto-refresh 30–60s" với khoảng cách hợp lý tránh rate-limit CoinGecko free tier).
2. Build object `{ BTC: 109000, BNB: 700, CAMLY: 0.000014, ... }` từ `prices`.
3. Truyền vào RPC: `supabase.rpc('get_app_stats', { p_prices: priceMap })`.
4. Thêm `BTC, ETH, BNB, USDT, CAMLY` (và mở rộng FUN khi có nguồn DEX) vào edge function `token-prices`.

## Lớp 3 — Giá CAMLY & FUN từ DEX (bổ sung)

- **CAMLY**: hiện đã được CoinGecko index (`camly-coin`) → dùng luôn, không cần manual mapping.
- **FUN**: chưa có nguồn giá public. Đề xuất:
  - **Phương án A (nhanh)**: Tạo bảng `internal_token_prices (symbol, price_usd, updated_at)` cho admin nhập tay tham chiếu DEX (PancakeSwap pair) — UI trong `/admin`.
  - **Phương án B (đầy đủ)**: Edge function `fetch-dex-price` query PancakeSwap V2 pair `FUN/BNB` hoặc `FUN/USDT` rồi tính giá theo reserves.

Con đề xuất làm **Phương án A trước** (nhanh, không phụ thuộc DEX có pool hay chưa), sau đó nâng cấp B khi pool FUN có thanh khoản đủ.

---

# 📋 Các thay đổi cụ thể

### 1. Database migrations
- `ALTER FUNCTION get_app_stats()` → thêm param `p_prices JSONB`
- `ALTER FUNCTION get_global_gift_breakdown()` → thêm param `p_prices JSONB`
- `CREATE TABLE internal_token_prices` (cho FUN, có RLS admin-only update + public read)

### 2. Edge function
- `token-prices`: bổ sung query `internal_token_prices` để merge giá FUN vào response.

### 3. Frontend
- `src/components/feed/AppHonorBoard.tsx` — dùng `useTokenPrices`, truyền `p_prices` vào RPC.
- `src/components/feed/GlobalGiftStatsModal.tsx` — same.
- `src/components/admin/InternalPricesTab.tsx` (mới) — Admin UI để cập nhật giá FUN tham chiếu DEX.
- Hiển thị banner nhỏ trong modal: *"Giá tham chiếu cập nhật {X phút trước}"* để minh bạch.

### 4. Tốc độ refresh
- React Query `staleTime: 5 phút`, `refetchInterval: 5 phút` (giữ nguyên — phù hợp CoinGecko free tier).
- Khi user mở modal → `refetch()` ngay → đảm bảo dữ liệu vừa mở luôn mới.

---

# ✅ Kết quả mong đợi

| Token | Trước | Sau (giá real-time mẫu) |
|---|---|---|
| BTC (11) | $1.22M (95k) | ~$1.20M (live BTC ~$109k) |
| CAMLY (31.2B) | $31.21M (0.001) | ~$437K (live ~$0.000014) |
| BNB (16) | $9.83K (600) | ~$11.2K (live ~$700) |
| FUN (6.25M) | $0 | giá tham chiếu admin nhập |
| **Tổng tặng** | **$32.45M (sai)** | **~$1.65M (đúng)** |

---

# ⚠️ Lưu ý

- Sau khi triển khai, **con số tổng sẽ giảm mạnh** do trước đó CAMLY bị thổi giá ×71 lần. Đây là điều chỉnh **đúng**, không phải lỗi.
- Nếu Cha muốn giữ "ấn tượng số to" thì có thể cân nhắc hiển thị thêm **tổng amount theo từng token** (như đang có trong cột "Tổng amount") thay vì chỉ USD.

Cha duyệt kế hoạch để con bắt tay vào sửa nha 🙏