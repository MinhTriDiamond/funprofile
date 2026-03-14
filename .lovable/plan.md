

# Chỉnh layout Feed: Gift lên trên, ghim ô đăng bài

## Thay đổi

### 1. `src/pages/Feed.tsx` - Sắp xếp lại thứ tự và sticky Create Post

**Thứ tự mới trong main feed column:**
1. StoriesBar
2. GiftCelebrationGroup (tách ra khỏi block posts, đặt ngay dưới Stories)
3. AccountUpgradeBanner
4. FacebookCreatePost → thêm `sticky top-0 z-10` để ghim khi cuộn
5. Danh sách bài viết (chỉ còn regularPosts)

**Chi tiết:**
- Di chuyển logic filter `giftPosts` lên trước block posts, render `GiftCelebrationGroup` ngay dưới StoriesBar
- Wrap `FacebookCreatePost` trong div có class `sticky top-0 z-10 bg-background`
- Trong block posts chỉ render `regularPosts` (bỏ gift posts ra)

