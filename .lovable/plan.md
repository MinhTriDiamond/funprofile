

# Kế hoạch tối ưu chi phí Cloud — 4 giải pháp

## Vấn đề gốc
- `useCamlyPrice` và `useTokenBalances` **cùng gọi** `token-prices` edge function song song, mỗi hook cache riêng nhưng dùng cùng `CACHE_KEY` → tần suất gọi **gấp đôi**
- `fetch-link-preview` gọi edge function mỗi lần render link mới, không có DB cache → lặp lại scraping cho cùng URL
- BTC scan gọi Mempool API bị 429 → tốn CPU retry
- localStorage cache TTL chỉ 60s, quá ngắn

---

## Giải pháp 1: Hợp nhất & giảm tần suất token-prices

**Vấn đề**: 2 hooks (`useCamlyPrice` + `useTokenBalances`) gọi cùng edge function độc lập → 960 calls/2 ngày.

**Thay đổi**:
- **`src/hooks/useTokenPrices.ts`** (file mới): Tạo 1 hook duy nhất `useTokenPrices()` dùng React Query với `staleTime: 10 * 60_000` (10 phút). Tất cả component dùng chung query key `['token-prices']` → chỉ 1 request dù mount bao nhiêu lần.
- **`src/hooks/useCamlyPrice.ts`**: Refactor thành wrapper đơn giản gọi `useTokenPrices()` rồi trích `CAMLY`.
- **`src/hooks/useTokenBalances.ts`**: Xóa logic fetch price riêng, import từ `useTokenPrices()`.
- Tăng `CACHE_TTL` localStorage lên **5 phút** (khớp với edge function cache).

**Ước tính giảm**: ~90% số lần gọi token-prices (từ ~480/ngày → ~50/ngày).

---

## Giải pháp 2: Cache link preview vào database

**Vấn đề**: 291 calls trong 2 ngày, mỗi call ~933ms CPU scraping lại cùng URL.

**Thay đổi**:
- **Migration**: Tạo bảng `link_preview_cache` (url TEXT PRIMARY KEY, data JSONB, fetched_at TIMESTAMPTZ). RLS: public read, service_role write.
- **`supabase/functions/fetch-link-preview/index.ts`**: Trước khi scrape, kiểm tra DB cache (TTL 7 ngày). Nếu có → trả về ngay. Nếu không → scrape rồi INSERT/UPSERT vào DB.
- **`src/hooks/useLinkPreview.ts`**: Giữ nguyên in-memory cache phía client (đã tốt).

**Ước tính giảm**: ~80% CPU time cho link preview (chỉ scrape URL mới, URL cũ trả từ DB <50ms).

---

## Giải pháp 3: Giảm tần suất BTC scan

**Vấn đề**: Mempool API trả 429, edge function retry tốn CPU.

**Thay đổi**:
- **`src/hooks/useScanIncoming.ts`**: Tăng cooldown từ 5 phút lên **15 phút**.
- **`src/components/wallet/tabs/HistoryTab.tsx`**: Cùng logic cooldown 15 phút cho nút scan trong HistoryTab.

**Ước tính giảm**: ~66% số lần gọi BTC scan.

---

## Giải pháp 4: Tăng client-side cache TTL toàn cục

**Vấn đề**: localStorage cache chỉ 60s, React Query staleTime 5 phút nhưng token hooks không dùng React Query.

**Thay đổi**:
- Đã xử lý trong Giải pháp 1 (chuyển sang React Query + tăng TTL).
- **`src/lib/queryClient.ts`**: Giữ nguyên staleTime 5 phút (đã hợp lý).

---

## Tổng kết thay đổi

| File | Hành động |
|---|---|
| `src/hooks/useTokenPrices.ts` | Tạo mới — hook chia sẻ React Query |
| `src/hooks/useCamlyPrice.ts` | Refactor — wrapper useTokenPrices |
| `src/hooks/useTokenBalances.ts` | Refactor — xóa fetch price riêng |
| `supabase/functions/fetch-link-preview/index.ts` | Thêm DB cache layer |
| `src/hooks/useScanIncoming.ts` | Tăng cooldown 15 phút |
| `src/components/wallet/tabs/HistoryTab.tsx` | Tăng cooldown 15 phút |
| Migration SQL | Tạo bảng `link_preview_cache` |

**Ước tính tiết kiệm tổng**: Giảm ~80-90% số lượng edge function calls → $20 có thể dùng được 2-3 tuần thay vì 2 ngày.

