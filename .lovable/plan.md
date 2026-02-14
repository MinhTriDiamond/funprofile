
# Thêm Thông Báo Khi User Claim Thưởng CAMLY

## Mô Tả

Khi người dùng claim CAMLY thành công, hệ thống sẽ tự động tạo thông báo (notification) hiển thị trong chuông thông báo, cho biết **FUN Profile Treasury** đã chuyển CAMLY về ví của họ.

## Thay Đổi

### 1. Edge Function `claim-reward` - Thêm notification insert

Sau khi giao dịch claim thành công (sau bước ghi `reward_claims` và `transactions`), thêm một bước insert vào bảng `notifications`:

- `user_id`: ID người dùng đang claim
- `actor_id`: ID tài khoản "fun profile treasury" (`9e702a6f-4035-4f30-9c04-f2e21419b37a`)
- `type`: `"claim_reward"` (loại thông báo mới)

### 2. Notification Utils - Thêm type `claim_reward`

Trong file `src/components/layout/notifications/utils.ts`:

- Thêm icon cho type `claim_reward`: icon Gift (vàng) - giống `reward_approved`
- Thêm text: **"FUN Profile Treasury"** + `đã chuyển phần thưởng CAMLY về ví của bạn`

### 3. Donation type - Thêm icon cho notification

Trong `getNotificationIcon`, thêm case `claim_reward` trả về icon `Wallet` màu vàng để phân biệt với donation thông thường.

## Chi Tiết Kỹ Thuật

### File sửa:

1. **`supabase/functions/claim-reward/index.ts`** (dòng ~326): Thêm notification insert sau audit_logs
2. **`src/components/layout/notifications/utils.ts`**: Thêm case `claim_reward` trong `getNotificationIcon` và `getNotificationText`

### Không cần thay đổi database

Bảng `notifications` đã có sẵn các cột cần thiết (`user_id`, `actor_id`, `type`, `read`, `created_at`). Chỉ cần thêm type mới `claim_reward`.
