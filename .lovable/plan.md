

## Nâng cấp Modal Thành Viên Mới + Thông báo chào mừng

### 3 tính năng chính

**1. Xem theo tuần/tháng + không giới hạn ngày**
- Thêm tabs/buttons: "Ngày" | "Tuần" | "Tháng" trong modal
- Tạo thêm RPC `get_weekly_signups_vn` và `get_monthly_signups_vn` (hoặc 1 RPC chung với tham số `p_mode`)
- Bỏ giới hạn 30 ngày cứng → cho phép tải thêm dữ liệu (load more / infinite scroll) hoặc chọn khoảng thời gian

**2. Nhấp vào ngày → hiện danh sách user đăng ký ngày đó**
- Khi click vào 1 dòng ngày, mở sub-view bên trong modal hiển thị danh sách user mới
- Tạo RPC `get_signups_by_date_vn(p_date text)` trả về `id, username, full_name, avatar_url, created_at` của các profiles đăng ký ngày đó (theo VN timezone)
- UI: Avatar + username + thời gian đăng ký, có thể click vào profile

**3. Toast chào mừng thành viên mới (góc phải dưới)**
- Enable realtime cho bảng `profiles` (`ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles`)
- Tạo hook `useNewMemberWelcome` lắng nghe `postgres_changes` event INSERT trên `profiles`
- Khi có member mới, hiện toast/notification ở góc dưới phải với avatar + username + "đã tham gia Fun.Rich! 🎉"
- Toast tự biến mất sau 5 giây, dùng Sonner toast

### Thay đổi cụ thể

| File | Thay đổi |
|------|---------|
| **Migration SQL** | Tạo 2 RPC mới: `get_signups_grouped_vn(p_mode, p_limit)` và `get_signups_by_date_vn(p_date)` + enable realtime cho profiles |
| **NewMembersModal.tsx** | Thêm state cho mode (day/week/month), load more, click vào row để xem chi tiết user |
| **NewMembersDateDetail.tsx** (mới) | Component con hiển thị danh sách user của 1 ngày cụ thể |
| **useNewMemberWelcome.ts** (mới) | Hook realtime lắng nghe INSERT profiles → hiện Sonner toast |
| **App.tsx** | Import và mount `useNewMemberWelcome` hook |

