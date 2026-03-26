

## Sửa lỗi không tải thêm bài viết khi cuộn xuống

### Nguyên nhân

Trong `useFeedPosts.ts`, hàm `fetchFeedPage` sắp xếp lại bài viết (bạn bè lên trước) **trước** khi tính `nextCursor`. Sau khi sắp xếp, bài cuối cùng không còn là bài cũ nhất theo thời gian → cursor bị sai → trang tiếp theo trả về bài trùng hoặc bỏ sót → `hasMore` trả false sớm → dừng tải.

### Thay đổi

**File: `src/hooks/useFeedPosts.ts`** — hàm `fetchFeedPage`:

Lưu `nextCursor` từ bài cuối cùng của query gốc (trước khi sort bạn bè), thay vì lấy từ mảng đã sắp xếp lại.

```text
Trước:  sort → lấy cursor từ postsData[last]
Sau:    lấy cursor từ postsToReturn[last] → rồi mới sort
```

Cụ thể:
1. Tính `nextCursor` ngay sau khi slice `postsToReturn` (dòng ~231), trước bước sort
2. Bỏ phần tính `nextCursor` ở cuối hàm (dòng ~265)

