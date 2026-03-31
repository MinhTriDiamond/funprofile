

## Sửa hiển thị bình luận trên Reels giống Facebook

### Vấn đề phát hiện

1. **Số lượng bình luận sai**: Bảng `reels` có `comment_count = 0` nhưng thực tế có 2 bình luận trong bảng `reel_comments`. Count không được đồng bộ chính xác.
2. **Hiển thị bình luận**: Cần đảm bảo bottom sheet mở ra đúng và hiển thị bình luận.

### Thay đổi

#### 1) `src/components/reels/ReelsFeed.tsx` — Hiển thị số bình luận thực tế
- Thay vì dùng `currentReel.comment_count` (giá trị cũ trong bảng `reels`), đếm trực tiếp từ bảng `reel_comments` bằng query riêng hoặc invalidate lại sau khi thêm comment.

#### 2) `src/hooks/useReels.ts` — Sửa logic đếm bình luận
- Trong `useReels()`: sau khi fetch reels, query thêm `reel_comments` để lấy count thực tế cho mỗi reel thay vì dùng `comment_count` column
- Trong `addComment` mutation: sau khi insert comment thành công, query count thực tế từ `reel_comments` rồi update lại `reels.comment_count`, thay vì cộng thêm 1 vào giá trị cũ (có thể sai)
- Invalidate cả query `['reels']` và `['reel-comments']` sau khi thêm/xoá comment

#### 3) Database migration — Sync `comment_count` hiện tại
- Chạy SQL để đồng bộ `comment_count` trong bảng `reels` với số lượng thực tế từ `reel_comments`:
```sql
UPDATE reels SET comment_count = (
  SELECT COUNT(*) FROM reel_comments WHERE reel_comments.reel_id = reels.id
);
```

#### 4) `src/components/reels/ReelComments.tsx` — Đảm bảo invalidate khi thêm/xoá comment
- Sau khi thêm hoặc xoá comment, invalidate query `['reels']` để cập nhật số lượng hiển thị trên nút bình luận ngay lập tức

### Kết quả
- Nút bình luận hiển thị đúng số lượng bình luận thực tế
- Bottom sheet mở ra và hiển thị đầy đủ danh sách bình luận
- Count tự động cập nhật khi thêm/xoá bình luận

