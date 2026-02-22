
# Khôi phục số liệu CAMLY cho tài khoản bị ban

## Mục tiêu
Tính toán lại phần thưởng (pending_reward) cho 116 tài khoản đã bị ban dựa trên lịch sử hoạt động thực tế, phục vụ mục đích lưu trữ và kiểm toán. Tài khoản vẫn giữ trạng thái bị ban, KHÔNG khôi phục hoạt động.

## Tình trạng hiện tại
- 116 tài khoản bị ban: tất cả pending_reward = 0, approved_reward = 0
- Đã rút tổng cộng: 71,969,000 CAMLY (đã có trong thống kê qua reward_claims)
- Phần thưởng chưa rút bị mất do hàm ban cũ reset về 0
- Không có bản ghi lưu số liệu gốc trước khi ban

## Kế hoạch thực hiện

### Bước 1: Tính lại pending_reward cho tài khoản bị ban
Viết migration SQL để:
- Tính tổng phần thưởng dựa trên hoạt động thực tế (bài viết, bình luận, cảm xúc, chia sẻ, kết bạn, livestream) theo công thức reward v2 hiện tại
- Trừ đi số đã rút (reward_claims)
- Cập nhật pending_reward = phần chênh lệch (phần thưởng chưa rút)
- Chỉ áp dụng cho tài khoản có is_banned = true

### Bước 2: Sửa hàm batch_ban_ghost_users
Cập nhật hàm này để KHÔNG reset pending_reward và approved_reward khi ban (giống như đã sửa ban_user_permanently)

### Bước 3: Sửa Edge Function batch-ban-users
Cập nhật edge function để KHÔNG reset pending_reward và approved_reward khi ban hàng loạt

### Bước 4: Ghi audit log
Tạo bản ghi kiểm toán ghi nhận việc khôi phục số liệu

## Chi tiết kỹ thuật

### Migration SQL - Tính lại reward cho tài khoản bị ban

Sử dụng công thức tương tự `get_user_rewards_v2` với cutoff date 2026-01-15:
- Trước 15/01: bài viết x 10,000, bình luận x 2,000, cảm xúc x 1,000, chia sẻ x 10,000, kết bạn x 10,000
- Sau 15/01: bài viết x 5,000 (cap 10/ngày), bình luận x 1,000 (cap 50/ngày), cảm xúc x 1,000 (cap 50/ngày), chia sẻ x 1,000 (cap 10/ngày), kết bạn x 10,000 (cap 10/ngày), livestream x 20,000 (cap 5/ngày)
- Cộng thêm 50,000 bonus cơ bản
- Trừ đi tổng đã rút từ reward_claims
- Kết quả = pending_reward cần khôi phục

### Sửa batch_ban_ghost_users

Bỏ dòng `pending_reward = 0, approved_reward = 0` - chỉ giữ `is_banned = true, reward_status = 'banned'`

### Sửa Edge Function batch-ban-users

Bỏ `pending_reward: 0, approved_reward: 0` trong update object

## Kết quả mong đợi
- Tổng phần thưởng trên Honor Board sẽ tăng lên (bao gồm cả phần thưởng chưa rút của tài khoản bị ban)
- Dữ liệu kiểm toán được bảo toàn đầy đủ
- Tài khoản bị ban vẫn giữ nguyên trạng thái ban, không thể hoạt động hay rút thưởng
- Các lần ban trong tương lai sẽ không reset số liệu nữa
