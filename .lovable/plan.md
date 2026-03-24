
Mình đã rà soát phần logic hiện tại, và đúng là vẫn còn nhiều chỗ đang tính `gift_celebration` như bài viết đủ điều kiện nhận CAMLY.

## Kết luận nguyên nhân

Hiện tại rule “gift không được tính là bài viết để thưởng CAMLY” chưa được áp dụng đồng bộ ở tất cả nơi tính thưởng:

1. `get_user_honor_stats`
- Đang tính `v_old_posts`, `v_new_posts`, `v_today_posts` từ bảng `posts`
- Điều kiện hiện tại chỉ kiểm tra `COALESCE(is_reward_eligible, true) = true`
- Chưa loại `post_type = 'gift_celebration'`
- Vì vậy ô `Hôm nay` và `Tổng thu` trên Honor Board vẫn có thể cộng CAMLY từ gift post

2. `get_user_rewards_v2`
- Đây là RPC đang được dùng ở ví / reward calculation
- `old_posts`, `new_daily_posts`, `today_stats.today_posts` cũng chưa loại `gift_celebration`
- Nghĩa là phần thưởng trong ví cũng có thể đang bị cộng sai từ gift post

3. `get_app_stats`
- Tổng CAMLY toàn hệ thống cũng đang cộng reward từ posts chỉ dựa vào `is_reward_eligible`
- Nếu gift post có `is_reward_eligible = true` thì vẫn bị cộng vào tổng thưởng hệ thống

4. `WalletCenterContainer.tsx`
- Điều kiện “Đăng ít nhất 1 bài hôm nay” hiện đếm mọi post trong ngày
- Nếu user chỉ có post gift thì vẫn có thể được coi là đã đăng bài hôm nay
- Cần sửa để gift không được dùng cho điều kiện claim

## Kế hoạch sửa

### 1. Chuẩn hoá rule loại gift khỏi mọi phép tính thưởng
Cập nhật các truy vấn SQL theo cùng một điều kiện chuẩn:

```sql
AND (post_type IS NULL OR post_type <> 'gift_celebration')
```

Áp dụng cho:
- `get_user_honor_stats`
  - `v_old_posts`
  - `v_new_posts`
  - `v_today_posts`
- `get_user_rewards_v2`
  - `old_posts`
  - `new_daily_posts`
  - `today_stats.today_posts`
- `get_app_stats`
  - các phần tổng hợp reward từ `posts`

Mục tiêu:
- Gift vẫn tồn tại trong feed/lịch sử giao dịch
- Nhưng không bao giờ được tính là “bài viết thưởng CAMLY”

### 2. Sửa phần hiển thị đếm bài viết thực tế cho đúng rule hiện hành
Trong `get_user_honor_stats`, phần `actual_posts_count` đang dùng:
```sql
post_type != 'gift_celebration'
```
Điều này vô tình loại luôn các dòng có `post_type IS NULL`.

Sẽ đổi thành:
```sql
(post_type IS NULL OR post_type <> 'gift_celebration')
```

Kết quả:
- Vẫn loại gift
- Nhưng bài viết thường có `post_type` rỗng/null sẽ được đếm đúng

### 3. Sửa điều kiện “đăng bài hôm nay” trong ví
Trong `src/components/wallet/WalletCenterContainer.tsx`, hàm `fetchTodayPostCount` sẽ đổi sang chỉ đếm:
- post của user hôm nay
- không phải `gift_celebration`

Kết quả:
- User chỉ đăng gift sẽ không vượt điều kiện “Đăng ít nhất 1 bài hôm nay”

### 4. Giữ nguyên các phần không nên đổi
Không đụng vào:
- logic hiển thị gift trong feed/profile
- lịch sử gift
- nhóm gift celebration
- drill-down thống kê nội dung vốn đã loại gift ở các migration gần đây

## Files / khu vực sẽ cập nhật

- `supabase/migrations/...new.sql`
  - tạo migration sửa:
    - `public.get_user_honor_stats`
    - `public.get_user_rewards_v2`
    - `public.get_app_stats`

- `src/components/wallet/WalletCenterContainer.tsx`
  - sửa `fetchTodayPostCount` để loại gift post

## Kết quả sau khi sửa

Sau bản sửa này:
- Gift post không cộng 5.000 CAMLY
- Gift post không làm tăng “Hôm nay”
- Gift post không làm tăng “Tổng thu”
- Gift post không giúp đạt điều kiện “đăng bài hôm nay” để claim
- Số bài viết hiển thị trên Honor Board vẫn đúng theo logic “bài viết thật”, không bị mất các post thường có `post_type = null`

## Ghi chú kỹ thuật
Hiện hệ thống đang có nhiều nhánh tính thưởng chạy song song:
- `get_user_honor_stats`
- `get_user_rewards_v2`
- `get_app_stats`
- đếm bài trong ví

Nên lần này cần sửa đồng bộ cả backend lẫn frontend, nếu không sẽ tiếp tục xảy ra lệch số giữa các màn hình dù đã sửa một chỗ.
