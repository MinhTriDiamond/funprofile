
# Sàng Lọc & Ngăn Chặn User Ảo

## Tình hình hiện tại

| Loại | Số lượng | Ghi chú |
|------|----------|---------|
| Tổng tài khoản | 580 | |
| Tài khoản "ma" (0 hoạt động, 0 hồ sơ) | 124 | Tất cả 0 CAMLY |
| Đang on_hold (thiết bị chung) | 65 | Chờ admin xử lý |
| Đã bị cấm | 1 | Quá ít so với thực tế |
| Nhóm thiết bị bị gắn cờ | 20+ | Lớn nhất 7 tài khoản/thiết bị |

## Kế hoạch xử lý

### Bước 1: Thêm tab "Dọn dẹp User ảo" vào Admin Dashboard

Thêm một tab mới trong trang Admin hiển thị:
- **Danh sách tài khoản ma**: Không avatar, không tên, không bài viết, không bình luận, không reaction
- **Nút "Cấm hàng loạt"**: Cho phép admin chọn tất cả hoặc từng nhóm để cấm nhanh
- **Bộ lọc thông minh**: Lọc theo thời gian tạo, trạng thái reward, mức độ hoạt động
- **Thống kê tổng quan**: Hiển thị số lượng user ảo, user on_hold, user bị cấm

### Bước 2: Tự động chặn đăng ký ảo (Edge Function)

Nâng cấp edge function `log-login-ip` để:
- Giảm ngưỡng cảnh báo thiết bị chung từ "hơn 0 user khác" xuống "hơn 2 user khác" (hiện tại bất kỳ 2 user trên cùng thiết bị đều bị hold - quá nhạy)
- Thêm kiểm tra **tốc độ đăng ký**: Nếu cùng 1 thiết bị tạo hơn 3 tài khoản trong 24 giờ, tự động cấm tất cả tài khoản mới

### Bước 3: Yêu cầu hoàn thiện hồ sơ trước khi nhận thưởng

Thêm logic vào hệ thống thưởng:
- Tài khoản không có avatar VÀ không có tên sẽ không được tính thưởng (is_reward_eligible = false)
- Hiển thị thông báo nhẹ nhàng yêu cầu người dùng cập nhật hồ sơ

---

## Chi tiết kỹ thuật

### File cần tạo mới
- `src/components/admin/GhostCleanupTab.tsx` - Tab dọn dẹp user ảo với:
  - Query hiển thị 124 tài khoản ma (no avatar, no name, no activity)
  - Checkbox chọn nhiều + nút "Cấm tất cả đã chọn"
  - Hiển thị: username, ngày tạo, reward_status, device_hash nếu có
  - Nút "Cấm tất cả tài khoản ma" (batch ban)

### File cần sửa
1. **`src/pages/Admin.tsx`**: Thêm tab "Ghost Cleanup" vào TabsList
2. **`supabase/functions/log-login-ip/index.ts`**: Sửa ngưỡng shared device từ `> 0` thành `> 2` (cho phép tối đa 3 tài khoản/thiết bị), thêm rate limit đăng ký mới trên cùng device
3. **`src/components/admin/WalletAbuseTab.tsx`**: Thêm nút batch action "Cấm tất cả ghost trong nhóm thiết bị"

### Database
- Tạo RPC function `batch_ban_ghost_users` cho phép admin cấm hàng loạt tài khoản không có hoạt động
