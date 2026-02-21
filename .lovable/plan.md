
# Plan: Loại bỏ User bị Ban khỏi Danh sách PPLP

## Vấn đề phát hiện

Có **3 lỗ hổng dữ liệu** khiến user bị ban vẫn hiển thị trong PPLP:

1. **RPC `get_pplp_admin_stats`**: Không lọc `is_banned`. Hiện có **37 user bị ban** với tổng **44,232 FUN** vẫn xuất hiện trong danh sách "Users Chờ Claim" và được tính vào thống kê Ecosystem.

2. **Mint Requests**: Có **20+ user bị ban** vẫn giữ mint requests ở trạng thái `pending_sig` (tổng ~13,000 FUN). Các requests này vẫn hiện trong tab "Chờ ký" và có thể được Admin ký nhầm.

3. **Edge Function `admin-merge-mint-requests`**: Khi gộp requests, không kiểm tra trạng thái ban, nên requests của user bị ban vẫn được gộp bình thường.

---

## Giải pháp

### 1. Cập nhật RPC `get_pplp_admin_stats` (Database Migration)

Thêm điều kiện `WHERE p.is_banned = false` vào CTE `enriched_users` để loại bỏ user bị ban khỏi:
- Danh sách "Top Users Chờ Claim"
- Thống kê "Tổng FUN chờ claim"
- Đếm "Users có ví" / "Users chưa có ví"

### 2. Tự động xóa/reject mint requests của user bị ban (Database Migration)

Chạy SQL để chuyển tất cả mint requests `pending_sig` của user bị ban sang trạng thái `rejected` (với lý do "User đã bị cấm").

### 3. Cập nhật Edge Function `admin-merge-mint-requests`

Thêm bước kiểm tra `is_banned` trước khi gộp -- bỏ qua các requests của user bị ban (tự động reject luôn).

### 4. Cập nhật Edge Function batch-create (nếu có) / Hook `usePplpAdmin`

Đảm bảo logic tạo mint requests hàng loạt cũng lọc user bị ban.

---

## Chi tiết kỹ thuật

### Database Migration

```text
1. DROP + CREATE FUNCTION get_pplp_admin_stats 
   -> Thêm JOIN profiles + WHERE is_banned = false

2. UPDATE pplp_mint_requests SET status = 'rejected', error_message = 'User đã bị cấm'
   WHERE status = 'pending_sig' AND user_id IN (SELECT id FROM profiles WHERE is_banned = true)
```

### File sửa
- `supabase/functions/admin-merge-mint-requests/index.ts` -- Thêm filter banned users
- `src/components/admin/PplpMintTab.tsx` -- Thêm badge cảnh báo nếu phát hiện user banned trong danh sách (tùy chọn)

### Tác động
- 37 user bị ban sẽ biến mất khỏi danh sách "Users Chờ Claim"
- 20+ mint requests của user bị ban sẽ tự động bị reject
- Thống kê Ecosystem sẽ chính xác hơn (giảm ~44,232 FUN ảo)
- Function gộp requests sẽ không gộp requests của user bị ban
