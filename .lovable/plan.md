

# Xóa 28 bài viết chúc mừng trùng lặp

## Vấn đề

Có **28 giao dịch** bị tạo trùng 2 bài viết `gift_celebration` cùng `tx_hash` và `gift_recipient_id`. Nguyên nhân: scanner hoặc backfill tạo bài viết 2 lần trong khoảng thời gian rất ngắn (1-2 giây).

## Giải pháp

Chạy 1 migration SQL để xóa bài viết trùng — giữ lại bài **tạo trước** (created_at nhỏ hơn), xóa bài **tạo sau**:

```sql
DELETE FROM posts
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY tx_hash, gift_recipient_id 
      ORDER BY created_at ASC
    ) AS rn
    FROM posts
    WHERE post_type = 'gift_celebration'
  ) dupes
  WHERE rn > 1
);
```

Cũng cần cập nhật `post_id` trong bảng `donations` nếu đang trỏ đến bài bị xóa.

## Kết quả

- 28 bài viết trùng bị xóa
- Mỗi giao dịch chỉ còn 1 bài chúc mừng duy nhất trên trang chủ

