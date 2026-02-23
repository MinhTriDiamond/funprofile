
# Thêm Nút Ban/Đình Chỉ Khi Rê Chuột Vào Trạng Thái

## Mô Tả
Khi admin rê chuột (hover) vào ô trạng thái "Hoạt động" của một user, sẽ hiển thị 2 nút hành động nhanh: **Cấm** (Ban vĩnh viễn) và **Đình chỉ** (On Hold). Giúp admin xử lý user ảo ngay tại danh sách mà không cần vào trang khác.

## Giao Diện
- Ô trạng thái bình thường hiển thị Badge như hiện tại
- Khi admin hover vào ô "Hoạt động": Badge ẩn đi, hiện 2 nút nhỏ:
  - Nút **Cấm** (đỏ) - gọi RPC `ban_user_permanently`
  - Nút **Đình chỉ** (cam) - cập nhật `reward_status = 'on_hold'`
- Khi hover vào ô "Đình chỉ": hiện nút **Cấm** và nút **Mở khóa** (xanh, đổi về `approved`)
- Ô "Cấm" không hiện nút gì thêm (đã bị ban rồi)
- Có dialog xác nhận trước khi thực hiện hành động

## Chi Tiết Kỹ Thuật

### File: `src/pages/Users.tsx`

1. **Thêm state**: `hoverUserId` để theo dõi user đang được hover, `actionTarget` để quản lý dialog xác nhận, `actionType` ('ban' hoặc 'suspend' hoặc 'unlock').

2. **Thay đổi cột Trạng thái**: Wrap nội dung trong div có `onMouseEnter`/`onMouseLeave`. Khi hover và user là admin:
   - User "Hoạt động": hiện 2 icon button nhỏ (Shield-ban + Pause)
   - User "Đình chỉ": hiện 2 icon button (Shield-ban + Unlock)
   - User "Cấm": giữ nguyên badge

3. **Thêm logic xử lý**:
   - **Ban**: gọi `supabase.rpc('ban_user_permanently', { p_admin_id, p_user_id, p_reason })` (pattern đã có sẵn trong SurveillanceTab)
   - **Đình chỉ**: gọi `supabase.from('profiles').update({ reward_status: 'on_hold' }).eq('id', userId)`
   - **Mở khóa**: gọi `supabase.from('profiles').update({ reward_status: 'approved' }).eq('id', userId)`
   - Sau mỗi hành động: invalidate query `user-directory` để refresh danh sách

4. **Dialog xác nhận**: Sử dụng `AlertDialog` hiện có, hiển thị tên hành động và username trước khi thực hiện.

5. **Lấy admin ID**: Dùng `supabase.auth.getSession()` để lấy user ID của admin (giống pattern trong SurveillanceTab).

### Chỉ chạy khi `isAdmin = true`
Các nút hover chỉ hiện cho admin, user thường không thấy gì khác biệt.
