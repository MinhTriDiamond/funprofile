

# Phân tích: Tại sao Database hiển thị Livestream = 0

## Phát hiện chính

**Dữ liệu thực tế trong database:**

| Bảng | Số lượng | Ghi chú |
|------|----------|---------|
| `live_sessions` | **600** (596 ended + 4 live) | Users livestream rất tích cực |
| `chunked_recordings` | **342** (314 done, 28 stuck "recording") | Ghi hình hoạt động |
| `posts` với `post_type = 'live'` | **519** | Bài đăng live |
| `posts` có video URL chứa "live" | **581** | Video replay |
| `recording_status = 'ready'` | **488** | Recordings thành công |
| `recording_status = 'failed'` | **57** | Recordings thất bại (~9.5%) |

**Kết luận: Users livestream RẤT NHIỀU — 600 phiên, 488 recordings thành công!**

## Nguyên nhân gốc: Hàm `get_app_stats` không đếm livestream

Hàm `get_app_stats()` hiện tại chỉ trả về:
- `total_users`, `total_posts`, `total_photos`, `total_videos` (đếm từ `posts WHERE video_url IS NOT NULL`)
- `total_rewards`, `treasury_camly_received`, `total_camly_claimed`

**Không có trường nào đếm `live_sessions`** hoặc `chunked_recordings`. Component `AppHonorBoard.tsx` hiển thị `total_videos = 897` — đó là tổng số posts có video (bao gồm cả live replay), nhưng **không có mục riêng cho "Livestream"**.

## Vấn đề phụ phát hiện thêm

1. **28 recordings stuck ở trạng thái "recording"** — phiên live đã kết thúc nhưng `chunked_recordings.status` không chuyển sang `done`. Đây là những sessions mà host đóng trình duyệt đột ngột trước khi finalize.

2. **57 sessions có `recording_status = 'failed'`** (~9.5%) — một số có `chunked_recordings.status = done` (recording thực ra thành công nhưng status ở `live_sessions` bị đánh failed sai).

3. **`live_recordings` table hoàn toàn trống** (0 rows) — Table này được thiết kế cho Agora server-side recording nhưng chưa bao giờ được sử dụng thành công vì hệ thống đang dùng client-side chunked recording thay thế.

## Kế hoạch sửa

### Task 1: Cập nhật `get_app_stats` thêm `total_livestreams`

Thêm trường `total_livestreams` vào hàm SQL:

```sql
DROP FUNCTION IF EXISTS public.get_app_stats();
CREATE OR REPLACE FUNCTION public.get_app_stats()
RETURNS TABLE(
  total_users BIGINT,
  total_posts BIGINT,
  total_photos BIGINT,
  total_videos BIGINT,
  total_livestreams BIGINT,
  total_rewards NUMERIC,
  treasury_camly_received NUMERIC,
  total_camly_claimed NUMERIC
) ...
-- Thêm:
(SELECT COUNT(*) FROM live_sessions)::BIGINT AS total_livestreams,
```

### Task 2: Cập nhật `AppHonorBoard.tsx`

- Thêm interface field `totalLivestreams`
- Parse từ response `row.total_livestreams`
- Thêm stat card với icon `Radio` và label "Livestreams"

### Task 3: Dọn dẹp stuck recordings

- Cập nhật 28 `chunked_recordings` stuck ở `status = 'recording'` mà `live_session` đã `ended` → chuyển sang `done` hoặc `failed`
- Sửa inconsistency: sessions có `recording_status = 'failed'` nhưng `chunked_recordings.status = 'done'`

### Technical Details

**Files cần sửa:**
1. Migration SQL mới — `DROP FUNCTION + CREATE OR REPLACE` cho `get_app_stats`
2. `src/components/feed/AppHonorBoard.tsx` — thêm livestream stat
3. `src/integrations/supabase/types.ts` — tự động cập nhật sau migration

**Không ảnh hưởng:** Các tính năng livestream hiện tại (start, join, record, replay) không bị ảnh hưởng. Đây chỉ là fix hiển thị thống kê.

