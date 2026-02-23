
# Thêm Nút Mở Khóa Tài Khoản Đình Chỉ (on_hold)

## Tình trạng hiện tại

Tab "Đang theo dõi - on_hold" trong mục Giám sát (SurveillanceTab) hiện chỉ có nút **Ban** để cấm vĩnh viễn. Thiếu nút **Mở khóa** để admin có thể khôi phục tài khoản hợp lệ sau khi kiểm tra.

## Thay đổi

### File: `src/components/admin/SurveillanceTab.tsx`

1. **Thêm trường `admin_notes`** vào query on_hold để hiển thị lý do bị đình chỉ
2. **Thêm nút "Mở khóa"** (icon Unlock, màu xanh) bên cạnh nút "Ban" cho mỗi user on_hold
3. **Hàm `handleUnlock`**: Khi admin nhấn mở khóa:
   - Cập nhật `reward_status = 'approved'` và xóa `admin_notes` (hoặc ghi chú mở khóa)
   - Đánh dấu các fraud signals liên quan là `is_resolved = true`
   - Ghi audit log
   - Hiển thị thông báo thành công và refresh danh sách
4. **Thêm cột "Lý do"** hiển thị `admin_notes` trong bảng on_hold để admin biết tại sao bị đình chỉ

### Chi tiết kỹ thuật

- Query on_hold: thêm `admin_notes` vào `.select()`
- Interface `OnHoldUser`: thêm trường `admin_notes`
- Hàm `handleUnlock(userId, username)`:
  - `supabase.from("profiles").update({ reward_status: "approved", admin_notes: "Mở khóa bởi admin..." }).eq("id", userId)`
  - `supabase.from("pplp_fraud_signals").update({ is_resolved: true }).eq("actor_id", userId)`
  - `supabase.from("audit_logs").insert({ admin_id, target_user_id, action: "UNLOCK_USER", reason: "..." })`
- State `unlocking` để disable nút trong khi xử lý
- Nút mở khóa có confirm dialog để tránh nhầm lẫn
