

# Hồi Lại 88 Từ Chối + Tạo Mint Requests Cho Users Có Ví

## Tình Trạng Hiện Tại

- **88 mint requests** bị từ chối (rejected) - tất cả trỏ đến cùng 1 địa chỉ ví sai
- **41 light_actions** đang bị kẹt ở trạng thái "rejected"
- **180 users** có ví + có actions approved nhưng chưa có mint request trong hàng đợi
- Chỉ có **6 requests** đang chờ ký

## Giải Pháp

### 1. Tạo Edge Function mới: `admin-batch-mint-requests`

Edge function dành riêng cho Admin thực hiện:

- Xác thực quyền admin qua bảng `user_roles`
- Xóa toàn bộ 88 mint requests bị rejected
- Reset 41 light_actions từ "rejected" về "approved"
- Tìm tất cả users có light_actions approved + có ví (ưu tiên `public_wallet_address`, fallback `wallet_address`)
- Tạo mint request mới cho từng user với đúng địa chỉ ví, nonce từ contract, evidence_hash và action_hash
- Trả về tổng kết: bao nhiêu requests đã tạo, bao nhiêu bỏ qua

### 2. Cập nhật UI: `PplpMintTab.tsx`

- Thêm nút "Tạo Mint Requests Hàng Loạt" trong phần Ecosystem Overview
- Dialog xác nhận hiển thị số users đủ điều kiện trước khi thực hiện
- Hiển thị kết quả sau khi hoàn thành
- Auto-refresh danh sách sau khi tạo xong

### 3. Cập nhật Hook: `usePplpAdmin.ts`

- Thêm hàm `batchCreateMintRequests` gọi edge function mới
- Thêm state loading riêng cho quá trình batch create

## Chi Tiết Kỹ Thuật

### Edge Function Logic

```text
POST /admin-batch-mint-requests
Authorization: Bearer <admin_token>

Bước 1: Verify admin role qua user_roles table
Bước 2: Delete 88 rejected mint requests
Bước 3: Reset rejected light_actions -> approved (clear mint_request_id)
Bước 4: Query all users with approved+eligible actions + wallet
Bước 5: For each user:
  - Get nonce from BSC Testnet contract
  - Calculate evidence_hash, action_hash
  - Create pplp_mint_requests record
  - Update light_actions with mint_request_id
Bước 6: Return summary { created, skipped, errors }
```

### Thay Đổi UI

```text
Phần Ecosystem Overview sẽ thêm:
+--------------------------------------------------+
| [Zap icon] Tạo Mint Requests Hàng Loạt (180 users)|
+--------------------------------------------------+
```

### Files cần tạo/sửa

1. **Mới**: `supabase/functions/admin-batch-mint-requests/index.ts`
2. **Sửa**: `src/hooks/usePplpAdmin.ts` - thêm `batchCreateMintRequests`
3. **Sửa**: `src/components/admin/PplpMintTab.tsx` - thêm nút + dialog
4. **Sửa**: `supabase/config.toml` - thêm config cho function mới (verify_jwt = false)

