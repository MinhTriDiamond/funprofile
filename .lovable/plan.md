

# Sửa avatar thông báo epoch_claim_ready — Hiển thị FUN.RICH thay vì avatar user

## Vấn đề
Notification `epoch_claim_ready` được tạo với `actor_id` trỏ đến admin (angelaivan) → avatar hiển thị là avatar của angelaivan thay vì logo FUN.RICH.

## Giải pháp

### 1. Sửa `NotificationItem.tsx` — Dùng logo FUN.RICH cho thông báo hệ thống

Thêm danh sách các notification type thuộc "hệ thống" (epoch_claim_ready, reward_adjustment, reward_approved, reward_rejected, claim_reward, account_banned). Với các type này:
- Avatar sẽ hiển thị logo `fun-profile-logo.png` thay vì `notification.actor.avatar_url`
- Fallback text sẽ là "FR" thay vì chữ cái đầu username

### 2. Sửa `utils.ts` — Cập nhật text hiển thị epoch_claim_ready

Thay vì dùng `username` (angelaivan), đổi thành:
- **"FUN.RICH"** là tên người gửi
- Text: `FUN.RICH thông báo đến bạn — FUN Money {epoch_month} — Bạn được nhận {amount} FUN!...`

Tương tự cho `reward_adjustment` và `claim_reward` — thay username bằng "FUN.RICH".

## File cần sửa
| File | Thay đổi |
|------|----------|
| `src/components/layout/notifications/NotificationItem.tsx` | Dùng logo FUN.RICH cho system notification types |
| `src/components/layout/notifications/utils.ts` | Đổi text epoch_claim_ready dùng "FUN.RICH" thay vì username |

