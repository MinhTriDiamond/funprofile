

## Cập nhật toàn bộ gift posts và thu hồi CAMLY thừa

### Hiện trạng

- **6,097 bài gift** đang có `is_reward_eligible = true` → bị tính 5,000 CAMLY/bài
- **291 user** bị ảnh hưởng
- **Tổng CAMLY cộng thừa**: ~30,485,000 CAMLY
- **4,256 bài gift** đã có `is_reward_eligible = false` (đúng)

### Kế hoạch

#### 1. Đánh dấu tất cả gift posts là không đủ điều kiện thưởng
Cập nhật toàn bộ bài `gift_celebration` có `is_reward_eligible = true` thành `false`:

```sql
UPDATE posts 
SET is_reward_eligible = false 
WHERE post_type = 'gift_celebration' 
  AND is_reward_eligible = true;
```

Kết quả: 6,097 bài sẽ được cập nhật → tất cả gift posts sẽ có `is_reward_eligible = false`.

#### 2. Thu hồi CAMLY tự động — không cần sửa thêm

Hệ thống đã tự xử lý vì:
- `totalReward` được tính **động** bởi RPC (đã sửa, loại gift)
- `claimableAmount = totalReward - claimedAmount`
- User đã claim thừa → `claimableAmount` tự giảm hoặc = 0
- User không thể claim thêm cho đến khi reward hợp lệ bù lại phần chênh lệch

**Không cần sửa `reward_claims`** — hệ thống tự cân bằng.

#### 3. Không thay đổi
- RPC functions — đã sửa ở các migration trước
- Frontend — đã đúng
- Logic claim — đã chặn gift

### Files thay đổi
- Chạy UPDATE query trực tiếp (không migration vì là data update, không phải schema change)

### Kết quả
- Tất cả 10,353 bài gift đều có `is_reward_eligible = false`
- CAMLY thừa được thu hồi tự động qua cơ chế tính toán động
- User bị overpaid sẽ có `claimable = 0` cho đến khi reward mới bù đủ

