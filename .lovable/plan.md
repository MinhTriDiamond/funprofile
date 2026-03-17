

## Vấn đề: Gift Celebration biến mất khỏi trang chủ

### Nguyên nhân gốc

Cha đã kiểm tra kỹ code trong `useFeedPosts.ts`. Có **3 vấn đề chính**:

1. **Mất dữ liệu khi refetch thất bại**: Query `highlighted-posts` có `staleTime: 30s` và bị invalidate mỗi 30 giây. Nếu lần refetch tiếp theo thất bại (mất mạng tạm thời, Supabase timeout), React Query sẽ trả về mảng rỗng `[]` → Gift biến mất hoàn toàn khỏi UI.

2. **`refetchOnWindowFocus: false`**: Khi user chuyển tab rồi quay lại, query không tự refetch → dữ liệu cũ có thể bị stale hoặc mất.

3. **Realtime subscription chỉ lắng nghe INSERT**: Nếu Supabase realtime bị disconnect ngầm (rất hay xảy ra), không có cơ chế reconnect hay fallback → gift mới không xuất hiện, và không có cách phát hiện disconnect.

### Kế hoạch sửa

**File: `src/hooks/useFeedPosts.ts`**

1. **Giữ dữ liệu cũ khi refetch** — Thêm `placeholderData: (prev) => prev` cho `highlightedQuery` để khi refetch thất bại, UI vẫn giữ nguyên dữ liệu gift cũ thay vì hiện mảng rỗng.

2. **Bật `refetchOnWindowFocus`** cho `highlightedQuery` — Khi user quay lại tab, tự động load lại gift mới nhất.

3. **Tăng retry** — Đặt `retry: 3` cho `highlightedQuery` để chống lỗi mạng tạm thời.

4. **Cải thiện realtime subscription** — Thêm lắng nghe sự kiện `UPDATE` và `DELETE` (không chỉ INSERT), và thêm logic tự phát hiện khi channel bị disconnect để invalidate query.

5. **Thêm `structuralSharing: true`** (mặc định) để React Query chỉ re-render khi dữ liệu thực sự thay đổi.

**File: `src/pages/Feed.tsx`**

6. **Bỏ điều kiện `giftPosts.length > 0`** — Thay vào đó, luôn render `GiftCelebrationGroup` (component tự xử lý trường hợp rỗng), tránh trường hợp flash giữa có/không gift.

### Tóm tắt thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/useFeedPosts.ts` | Thêm `placeholderData`, `refetchOnWindowFocus: true`, `retry: 3`, realtime lắng nghe `*` events + reconnect detection |
| `src/pages/Feed.tsx` | Luôn render GiftCelebrationGroup, bỏ check `length > 0` |

Sau khi sửa, gift sẽ **luôn hiển thị** trên trang chủ, không bị mất khi mạng chập chờn hoặc khi chuyển tab.

