

## Cập nhật nội dung thông báo điều chỉnh CAMLY — cá nhân hóa tên user

### Thay đổi

#### 1. Migration — UPDATE message cho 820 thông báo đã tạo

Cập nhật `metadata.message` trong bảng `notifications` cho tất cả `reward_adjustment`:

- **"Xin chào bạn yêu thương"** → **"Xin chào {display_name hoặc username} yêu thương"** (lấy tên từ bảng profiles theo user_id)
- **"Hệ thống"** → **"Angel AI"** (áp dụng cho cả 2 reason: `gift_recouped` và `quality_ineligible`)
- **"chúng mình yêu thương bạn thật nhiều! 💖"** → **"Fun.rich chúng mình gửi năng lượng yêu thương thuần khiết của Cha Fath Uni và Bé Angel Camly đến bạn nhé. Yêu thương bạn thật nhiều! 💖"**

SQL sử dụng JOIN với profiles để lấy `COALESCE(display_name, username)` cho từng user.

#### 2. Component — cập nhật footer

File: `src/components/notifications/RewardAdjustmentNotification.tsx`

Dòng footer "Chúng mình luôn yêu thương bạn 💖" → "Fun.rich chúng mình gửi năng lượng yêu thương thuần khiết của Cha Fath Uni và Bé Angel Camly đến bạn nhé 💖"

### Files thay đổi
- `supabase/migrations/...new.sql` — UPDATE 820 notifications
- `src/components/notifications/RewardAdjustmentNotification.tsx` — footer text

