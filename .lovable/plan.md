

# Cập nhật Gift Celebration hiển thị realtime

## Vấn đề
1. Polling 30s chỉ invalidate `feed-posts` nhưng **không invalidate `highlighted-posts`** → gift mới không xuất hiện
2. Không có realtime subscription cho bài gift_celebration → phải chờ refresh thủ công mới thấy gift mới

## Giải pháp

### 1. `src/hooks/useFeedPosts.ts` — Thêm polling + realtime cho highlighted posts
- Thêm `highlighted-posts` vào interval polling 30s (cùng với `feed-posts`)
- Thêm Supabase Realtime subscription lắng nghe INSERT trên bảng `posts` với filter `post_type=eq.gift_celebration` → khi có gift mới, tự động invalidate cả `highlighted-posts` và `feed-posts`

### 2. `src/components/feed/GiftCelebrationGroup.tsx` — Cập nhật tổng số tự động
- Component đã hiển thị `{posts.length} gifts` — khi dữ liệu được refetch, số này sẽ tự cập nhật
- Không cần thay đổi thêm ở component này

```text
Flow:
  New donation inserted → Realtime event fires
       ↓
  invalidateQueries(['highlighted-posts'])
  invalidateQueries(['feed-posts'])
       ↓
  fetchHighlightedPosts() re-runs (limit 200)
       ↓
  GiftCelebrationGroup re-renders with updated posts.length
```

