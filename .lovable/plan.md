

## Mục tiêu
Xóa bỏ 2 mục **Cảm xúc** (reactions) và **Bình luận** (comments) khỏi bảng Honor Board cá nhân, cả trên Desktop và Mobile.

## Thay đổi cần thực hiện

### File: `src/components/profile/CoverHonorBoard.tsx`

**1. Desktop Layout (CoverHonorBoard component)**
- Tìm phần `Two Column Layout - 6 items (3 per column)`
- Xóa 2 dòng `StatRow` cho `reactions` và `comments`
- Chỉ giữ lại 4 mục: Posts, Friends, Claimable, Claimed (2 mục mỗi cột)
- Cập nhật comment thành `Two Column Layout - 4 items (2 per column)`

**2. Mobile Layout (MobileStats component)**
- Tìm phần `Two Column Layout` trong MobileStats
- Xóa 2 dòng `MobileTotalRow` cho `reactions` và `comments`
- Chỉ giữ lại 4 mục: Posts, Friends, Claimable, Claimed
- Cập nhật comment tương ứng

**3. Cleanup imports**
- Xóa `Star` và `MessageCircle` khỏi dòng import từ `lucide-react` nếu không còn dùng ở chỗ khác

## Kết quả mong đợi
- Honor Board chỉ hiển thị 4 mục chính: Bài viết, Bạn bè, Chờ nhận, Đã nhận
- Layout cân đối 2 cột, mỗi cột 2 mục
- Không còn hiển thị Cảm xúc và Bình luận

