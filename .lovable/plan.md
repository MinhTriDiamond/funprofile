

## Hiển thị bình luận mặc định + Tooltip xem ai đã reaction

### Thay đổi

**1. File `src/components/feed/FacebookPostCard.tsx`**
- Bỏ điều kiện `showComments` — luôn hiển thị `CommentSection` bên dưới footer (giống Facebook)
- Giữ state `showComments` mặc định là `true` thay vì `false`
- Nút "Bình luận" sẽ focus vào ô nhập bình luận thay vì toggle ẩn/hiện

**2. File `src/components/feed/ReactionSummary.tsx`**
- Thêm **tooltip** khi hover vào phần emoji + số lượng bên phải
- Tooltip sẽ gọi API lấy danh sách người đã reaction (tối đa 5-10 tên) và hiển thị dạng:
  ```
  Nguyễn Văn A
  Trần Thị B
  và 3 người khác
  ```
- Sử dụng `Tooltip` từ `@radix-ui/react-tooltip` đã có sẵn
- Tạo component con `ReactionTooltipContent` để lazy-fetch danh sách users khi hover

**3. File `src/components/feed/GiftCelebrationCard.tsx`**
- Tương tự: mặc định hiển thị CommentSection luôn

### Layout mục tiêu
```text
┌──────────────────────────────────────────┐
│ [Nội dung bài viết]                      │
├──────────────────────────────────────────┤
│ 🥰 1                    2 bình luận      │ ← hover vào "🥰 1" hiện tooltip tên người
├──────────────────────────────────────────┤
│ 🥰 Thương | 💬 Bình luận | ↗️ Chia sẻ | 🎁│
├──────────────────────────────────────────┤
│ [Phần bình luận luôn hiển thị]           │ ← không cần click mới hiện
│ [Ô nhập bình luận]                       │
└──────────────────────────────────────────┘
```

### Files thay đổi
- `src/components/feed/FacebookPostCard.tsx` — Luôn hiển thị CommentSection
- `src/components/feed/ReactionSummary.tsx` — Thêm tooltip hover hiện tên người reaction
- `src/components/feed/GiftCelebrationCard.tsx` — Luôn hiển thị CommentSection

