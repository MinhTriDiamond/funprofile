

## Sửa build error + thêm nền trắng cho hàng Thích/Bình luận/Chia sẻ

### Vấn đề
1. **Build error** — cần kiểm tra lỗi cụ thể (có thể từ NotificationDropdown vừa sửa)
2. **UI**: User muốn hàng nút "Thích / Bình luận / Chia sẻ" có **nền trắng** (hiện đang trong suốt)

### Thay đổi

#### 1) Fix build error
Kiểm tra và sửa lỗi build trong `NotificationDropdown.tsx` (file vừa thay đổi lớn nhất). Có thể là lỗi import hoặc type mismatch.

#### 2) `src/components/feed/PostFooter.tsx` — Thêm nền trắng cho action buttons row
- Dòng 42: thêm `bg-white dark:bg-card` vào div chứa các nút:
  ```
  <div className="border-t border-border flex items-center py-0.5 bg-white dark:bg-card">
  ```

#### 3) `src/components/feed/GiftCelebrationCard.tsx` — Hàng action buttons của bài tặng tiền
- Dòng 460-461: thay `bg-black/10` thành `bg-white dark:bg-card` và đổi text color:
  ```
  <div className="border-t border-border mx-2 sm:mx-4 bg-white dark:bg-card">
    <div className="flex items-center py-1 [&_.text-muted-foreground]:text-foreground">
  ```

### Kết quả
- Build chạy được
- Hàng nút Thích/Bình luận/Chia sẻ có nền trắng rõ ràng trên cả bài viết thường và bài tặng tiền

