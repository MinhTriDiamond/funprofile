

# Hồi Lại Từ Chối + Tạo Mint Requests Cho Users Có Ví

## Van De Phat Hien

1. **88 mint requests bị từ chối** cần được hồi lại. Tuy nhiên, tất cả 88 request cũ đều trỏ đến **cùng một địa chỉ ví sai** (0x44d1...3858) - không phải ví riêng của từng user. Vì vậy, không thể chỉ đơn giản chuyển trạng thái về "Chờ ký" mà cần **xóa request cũ** và **tạo request mới** với đúng địa chỉ ví của từng user.

2. **179 users có ví** nhưng chưa có mint request trong hàng đợi. Cần tạo mint requests tự động cho tất cả users này.

3. **41 light_actions đang bị "rejected"** cần được reset về "approved" để có thể tạo mint request mới.

## Ke Hoach Sua

### 1. Tao Edge Function moi: `admin-batch-mint-requests`
Chức năng: Admin gọi để tự động tạo mint requests cho tất cả users đủ điều kiện.

Logic:
- Xóa tất cả mint requests bị từ chối (88 requests)
- Reset 41 light_actions từ "rejected" về "approved"
- Tìm tất cả users có light_actions "approved" + có ví (ưu tiên public_wallet_address, fallback wallet_address)
- Tạo mint request mới cho từng user với đúng địa chỉ ví của họ
- Trả về kết quả: bao nhiêu request được tạo, bao nhiêu bị bỏ qua (chưa có ví)

### 2. Cap nhat UI: PplpMintTab.tsx
- Thêm nút "Tạo Mint Requests Hàng Loạt" trong phần Ecosystem Overview
- Nút hiển thị số lượng users đủ điều kiện (179 users có ví)
- Hiển thị dialog xác nhận trước khi thực hiện
- Hiển thị kết quả sau khi hoàn thành (số requests đã tạo)

### 3. Cap nhat Hook: usePplpAdmin.ts
- Thêm hàm `batchCreateMintRequests` gọi edge function mới
- Thêm state loading cho quá trình batch create

## Chi Tiet Ky Thuat

### Edge Function `admin-batch-mint-requests`:
```text
POST /admin-batch-mint-requests
Headers: Authorization: Bearer <admin_token>

Steps:
1. Verify admin role
2. Delete rejected mint requests
3. Reset rejected light_actions -> approved
4. For each user with approved actions + wallet:
   - Group all approved actions
   - Get nonce from contract
   - Generate evidence_hash, action_hash
   - Create pplp_mint_requests record
   - Update light_actions with mint_request_id
5. Return summary
```

### UI Changes:
```text
+--------------------------------------------------+
| 🌍 Tổng Quan FUN Money Ecosystem                |
| [Stats Cards...]                                  |
|                                                   |
| [🔄 Hồi lại 88 từ chối] [⚡ Tạo Mint (179 users)]|
+--------------------------------------------------+
```

### Files can sua:
1. **Moi**: `supabase/functions/admin-batch-mint-requests/index.ts` - Edge function tạo batch mint requests
2. **Sua**: `src/hooks/usePplpAdmin.ts` - Thêm hàm `batchCreateMintRequests`
3. **Sua**: `src/components/admin/PplpMintTab.tsx` - Thêm nút batch create + dialog xác nhận

