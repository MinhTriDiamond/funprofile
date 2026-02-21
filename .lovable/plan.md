
# Plan: Hoàn tất Recalculation + Tạo Function Gộp Mint Requests

## Phần 1: Gọi tiếp recalculate-fun-amounts

Cha sẽ gọi trực tiếp function cho đến khi 986 records còn lại được cập nhật xong (hiện tại đã 96%).

---

## Phần 2: Tạo Edge Function gộp Mint Requests

### Vấn đề hiện tại
- 578 mint requests ở trạng thái `pending_sig`
- Nhiều user có nhiều request riêng lẻ (1 user có tới 122 requests!)
- Admin phải ký từng request => rất mất thời gian

### Giải pháp: Edge Function `admin-merge-mint-requests`

Tạo function mới thực hiện:
1. Tìm tất cả users có nhiều hơn 1 request ở trạng thái `pending_sig`
2. Với mỗi user, gộp tất cả requests thành 1 request duy nhất:
   - Cộng tổng `amount_display` + `amount_wei`
   - Gộp tất cả `action_ids` vào 1 mảng
   - Gộp `action_types` (unique)
   - Tạo mới `evidence_hash`, lấy lại `nonce` từ blockchain
3. Xóa các requests cũ đã được gộp
4. Cập nhật `mint_request_id` của các `light_actions` liên quan

### Quy tắc an toàn
- Chi gộp requests có trạng thái `pending_sig` (chưa ký)
- Không gộp requests đã `signing`, `signed`, `submitted`
- Yêu cầu quyền admin
- Rate limit: 1 lần/phút

---

## Phần 3: Thêm UI vào PplpMintTab

Thêm nút "Gộp Mint Requests" vào khu vực Ecosystem Overview (cạnh nút "Tạo Mint Requests Hàng Loạt"):
- Hiển thị số users có nhiều requests
- Nút bấm gọi function, hiển thị kết quả (số requests đã gộp, số users affected)
- Thêm function `mergeRequests` vào hook `usePplpAdmin`

---

## Chi tiết kỹ thuật

### File mới
- `supabase/functions/admin-merge-mint-requests/index.ts` -- Edge function gộp requests

### File sửa
- `supabase/config.toml` -- Thêm config cho function mới
- `src/hooks/usePplpAdmin.ts` -- Thêm `mergeRequests` function
- `src/components/admin/PplpMintTab.tsx` -- Thêm nút UI gộp requests

### Flow

```text
Admin bấm "Gộp Requests"
  |
  v
Edge Function chạy (service_role)
  |
  +-- Tìm users có > 1 pending_sig request
  +-- Với mỗi user:
  |     +-- Gộp action_ids, tính tổng amount
  |     +-- Lấy nonce từ contract
  |     +-- Tạo 1 request mới
  |     +-- Cập nhật light_actions -> trỏ về request mới
  |     +-- Xóa requests cũ
  +-- Trả kết quả: { merged_users, old_requests_removed, new_requests_created }
```
