

# Cập Nhật Hiển Thị Thông Báo Tặng Thưởng & Các Loại Còn Thiếu

## Vấn đề

Hiện tại có **540 thông báo loại `donation`** và **5 thông báo `claim_reward`** trong database nhưng cả hai nơi hiển thị đều không xử lý chúng:

1. **Dropdown thông báo** (`utils.ts`): Thiếu case `donation` -- hiển thị fallback "đã tương tác với bạn"
2. **Trang Thông báo** (`Notifications.tsx`): Thiếu nhiều loại -- `donation`, `claim_reward`, `live_started`, `comment_reply`, `care`, `pray`, và các loại admin. Hiển thị "Bạn có thông báo mới"
3. **Trang Thông báo** cũng không fetch `metadata` nên các thông báo admin cũng không hiển thị chi tiết
4. **Bộ lọc** trên trang Thông báo không có mục cho tặng thưởng

## Giải pháp

### 1. Thêm `donation` vào dropdown (`utils.ts`)

Thêm case vào `getNotificationIcon` và `getNotificationText`:
- Icon: Gift (xanh lá)
- Text: **"username đã tặng quà cho bạn"**

### 2. Cập nhật toàn bộ trang Thông báo (`Notifications.tsx`)

- Thêm `metadata` vào query `.select()`
- Thêm tất cả các case còn thiếu vào `getNotificationIcon` và `getNotificationText`:
  - `donation`: "username đã tặng quà cho bạn"
  - `claim_reward`: "FUN Profile Treasury đã chuyển phần thưởng CAMLY về ví của bạn"
  - `live_started`: "username đang phát trực tiếp"
  - `comment_reply`: "username đã trả lời bình luận của bạn"
  - `care`, `pray`: text tương ứng
  - Admin types: hiển thị chi tiết từ metadata
- Thêm bộ lọc "Tặng thưởng" (donations) vào filter tabs
- Thêm navigation: khi click `donation` -> profile người tặng, `claim_reward` -> wallet, `live_started` -> live session

### 3. Cập nhật navigation trong dropdown

Thêm xử lý click cho `donation` -> navigate đến profile người tặng.

## Chi tiết kỹ thuật

### File cần sửa

**`src/components/layout/notifications/utils.ts`**:
- Thêm case `donation` vào `getNotificationIcon` (Gift icon xanh lá)
- Thêm case `donation` vào `getNotificationText`

**`src/pages/Notifications.tsx`**:
- Interface `NotificationWithActor`: thêm trường `metadata`
- Query select: thêm `metadata`
- `getNotificationIcon`: thêm `donation`, `claim_reward`, `live_started`, `comment_reply`, `care`, `pray`, admin types
- `getNotificationText`: thêm tất cả case còn thiếu với metadata support
- `filterNotifications`: thêm case `donations` filter
- `filterOptions`: thêm tab "Tặng thưởng"
- `handleNotificationClick`: thêm navigation cho `donation` (-> profile), `claim_reward` (-> wallet), `live_started` (-> live session)
- Type `NotificationFilter`: thêm `"donations"`

**`src/components/layout/NotificationDropdown.tsx`**:
- `handleNotificationClick`: thêm navigation cho `donation` -> profile actor

