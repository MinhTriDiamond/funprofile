

## Kế hoạch: Tạo trang admin duyệt nhanh danh sách user đủ tiêu chí nhận quà

### Mục tiêu
Thêm một tab mới "Đủ tiêu chí" vào trong `UserManagementTab`, hiển thị danh sách user đáp ứng đủ 5 tiêu chí (≥2 social links thật, ≥10 ngày hoạt động, có donation on-chain, có ví BSC, light score cao). Admin có thể Approve/Reject từng user và xuất CSV.

### Kiến trúc

**1. Tạo RPC function mới trong database**
- Tạo function `get_qualified_reward_users(p_admin_id UUID)` trả về danh sách user đủ tiêu chí
- Logic: JOIN `profiles`, `posts`, `donations`, `light_reputation`, `social_links` JSONB
- Điều kiện: `is_banned = false`, real social links ≥ 2, active days ≥ 10, confirmed donations ≥ 1, light score > 0
- Trả về: username, avatar, full_name, real_links count, days_active, donation_count, total_donated, light_score, tier, wallet_address, reward_status
- Yêu cầu admin role (security definer)

**2. Tạo component `QualifiedUsersTab.tsx`**
- File: `src/components/admin/QualifiedUsersTab.tsx`
- Hiển thị bảng danh sách user đủ tiêu chí với các cột: Username, Social Links, Ngày hoạt động, Donations, Light Score, Ví BSC, Trạng thái, Actions
- Summary cards: Tổng đủ tiêu chí, Đã Approved, Đang On Hold, Chưa có ví
- Nút **Approve** (chuyển reward_status → approved) và **Reject** (chuyển → rejected) cho từng user
- Batch approve cho nhiều user cùng lúc
- Nút **Xuất CSV** export toàn bộ danh sách
- Tìm kiếm theo username
- Sắp xếp theo light score, số social links, ngày hoạt động

**3. Cập nhật `UserManagementTab.tsx`**
- Thêm tab thứ 5 "Đủ tiêu chí" với icon Trophy
- Import và render `QualifiedUsersTab`

### Chi tiết kỹ thuật

- RPC function sử dụng `SECURITY DEFINER` và kiểm tra `has_role(p_admin_id, 'admin')`
- Social links đếm bằng `jsonb_array_elements` lọc URL không rỗng
- Active days đếm `DISTINCT (created_at AT TIME ZONE 'UTC')::DATE` từ bảng `posts`
- Donations đếm từ bảng `donations` có `status = 'confirmed'` và `tx_hash IS NOT NULL`
- Approve/Reject gọi trực tiếp update `profiles.reward_status` + insert `audit_logs`
- CSV xuất với BOM UTF-8 để hỗ trợ tiếng Việt trong Excel

