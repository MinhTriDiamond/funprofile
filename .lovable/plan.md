

## Kế hoạch: Thêm modal chi tiết cho tất cả mục trong Honor Board

### Tổng quan
Hiện tại chỉ có 2 mục clickable: **Tổng Thành Viên** (NewMembersModal) và **Tổng Đã Tặng** (ClaimHistoryModal). Cần thêm modal chi tiết cho 5 mục còn lại: Tổng Bài Viết, Tổng Hình Ảnh, Tổng Video, Tổng Livestream, Tổng Phần Thưởng.

### Cách tiếp cận
Tạo **1 component modal chung** (`ContentStatsModal`) thay vì 5 modal riêng, vì cả 5 mục đều có cùng pattern: hiển thị số liệu nhóm theo ngày/tuần/tháng (giống NewMembersModal).

### Các bước

**1. Tạo RPC function `get_content_stats_grouped_vn`**
- Nhận tham số: `p_type` (posts/photos/videos/livestreams/rewards), `p_mode` (day/week/month), `p_limit`, `p_offset`
- Trả về: `period_label` (YYYY-MM-DD) + `count` (số lượng)
- Logic:
  - `posts`: đếm từ bảng `posts` WHERE `post_type = 'normal'`
  - `photos`: đếm từ `posts` WHERE có `image_url` hoặc `media_urls` chứa ảnh
  - `videos`: đếm từ `posts` WHERE có `video_url`
  - `livestreams`: đếm từ bảng `livestreams`
  - `rewards`: tổng `amount` từ bảng `reward_approvals` WHERE `status = 'approved'`
- Nhóm theo ngày Việt Nam (`timezone 'Asia/Ho_Chi_Minh'`)

**2. Tạo component `ContentStatsModal`**
- File: `src/components/feed/ContentStatsModal.tsx`
- Tái sử dụng cấu trúc UI từ `NewMembersModal`: Dialog 792px, tabs Ngày/Tuần/Tháng, bảng sticky header, nút "Xem thêm"
- Props: `open`, `onOpenChange`, `type` (posts/photos/videos/livestreams/rewards), `title`, `icon`
- Gọi RPC `get_content_stats_grouped_vn` với `p_type` tương ứng
- Màu sắc text xanh lá đậm đồng nhất với NewMembersModal

**3. Cập nhật `AppHonorBoard.tsx`**
- Thêm state cho modal mới: `activeModal` (string | null)
- Tất cả 7 mục đều clickable, mỗi mục mở modal tương ứng:
  - Tổng Thành Viên → NewMembersModal (giữ nguyên)
  - Tổng Đã Tặng → ClaimHistoryModal (giữ nguyên)
  - 5 mục còn lại → ContentStatsModal với `type` phù hợp
- Thêm underline decoration-dotted cho tất cả mục (giống 2 mục hiện tại)

### Chi tiết kỹ thuật
- Database: 1 migration tạo RPC `get_content_stats_grouped_vn`
- Files tạo mới: `src/components/feed/ContentStatsModal.tsx`
- Files sửa: `src/components/feed/AppHonorBoard.tsx`

