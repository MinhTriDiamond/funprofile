

# Ghim cảnh báo gian lận lên đầu + Điều hướng đến danh sách user bị cảnh báo

## Vấn đề hiện tại
- Cảnh báo gian lận (shared device, email farm, blacklisted IP, fraud daily) hiển thị xen lẫn với các thông báo thường, dễ bị trôi mất
- Khi nhấp vào cảnh báo, không có hành động nào xảy ra (không navigate đi đâu)

## Giải pháp

### 1. Ghim cảnh báo gian lận lên đầu danh sách

**File: `src/pages/Notifications.tsx`**
- Tách `filteredNotifications` thành 2 nhóm: `fraudNotifications` (4 loại admin_*) và `normalNotifications`
- Render `fraudNotifications` trong section riêng ở đầu với tiêu đề "🛡️ Cảnh báo bảo mật" và viền đỏ nổi bật
- `normalNotifications` render phía dưới như bình thường

**File: `src/components/layout/NotificationDropdown.tsx`**
- Tương tự, tách fraud notifications ra khỏi `otherNotifications` và render trước các nhóm thời gian (new/today/yesterday...)
- Hiển thị trong section ghim riêng với style cảnh báo đỏ

### 2. Nhấp vào cảnh báo → Navigate đến Admin Fraud Tab

**File: `src/pages/Notifications.tsx` → `handleNotificationClick`**
- Thêm case cho 4 loại fraud → `navigate('/admin?tab=fraud')` kèm theo metadata (device_hash, email_base, ip_address) qua query params hoặc state

**File: `src/components/layout/NotificationDropdown.tsx` → `handleNotificationClick`**
- Thêm case tương tự cho fraud notifications

**File: `src/pages/Admin.tsx`**
- Đọc query param `tab` từ URL và set `activeTab` tương ứng khi mount
- Ví dụ: `/admin?tab=fraud` sẽ tự động mở tab "Chống gian lận"

### Tóm tắt thay đổi
| File | Thay đổi |
|---|---|
| `src/pages/Notifications.tsx` | Tách + ghim fraud notifications lên đầu, thêm navigate khi click |
| `src/components/layout/NotificationDropdown.tsx` | Tách + ghim fraud section, thêm navigate khi click |
| `src/pages/Admin.tsx` | Đọc `?tab=` param để auto-select tab |

