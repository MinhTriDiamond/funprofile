
# Nâng Cấp "Top Users Chờ Claim" - Hiển Thị Đầy Đủ + Sửa Phát Hiện Ví

## Vấn Đề Phát Hiện

1. **Bảng chỉ hiển thị 20 users** - Cần hiển thị TẤT CẢ users với thanh cuộn
2. **Phát hiện ví sai** - Hệ thống chỉ kiểm tra `public_wallet_address`, nhưng rất nhiều users đã lưu ví ở trường `wallet_address` (cũ). Hiện tại 27 users có `public_wallet_address` nhưng thực tế có thêm ~156 users đã có ví trong `wallet_address`. Dẫn đến card "Users chưa có ví" hiển thị sai (178 thay vì thực tế ít hơn nhiều).

## Kế Hoạch Sửa

### 1. Cập nhật RPC `get_pplp_admin_stats`
- Bỏ `LIMIT 20`, trả về TẤT CẢ users có approved actions
- Sửa logic kiểm tra ví: kiểm tra cả `public_wallet_address` VÀ `wallet_address` (fallback)
- Thêm cột `wallet_address` vào kết quả để Admin thấy được địa chỉ ví thực tế

### 2. Cập nhật giao diện PplpMintTab.tsx
- Tăng chiều cao ScrollArea từ 300px lên 500px để xem được nhiều users hơn
- Hiển thị thêm địa chỉ ví (rút gọn) bên cạnh tên user
- Icon ví phân biệt 3 trạng thái:
  - Xanh lá: có `public_wallet_address` (ví chính thức)
  - Vàng: chỉ có `wallet_address` (ví cũ, cần cập nhật)
  - Đỏ: chưa có ví nào

### 3. Cập nhật types trong usePplpAdmin.ts
- Thêm trường `wallet_address` vào interface `EcosystemTopUser`

## Chi Tiết Kỹ Thuật

### Database Migration - Sửa RPC function:
```sql
-- Bỏ LIMIT 20, thêm kiểm tra wallet_address
-- has_wallet = public_wallet_address OR wallet_address
-- Thêm wallet_address vào kết quả top_users
```

### Files cần sửa:
1. **Database**: Migration mới để cập nhật `get_pplp_admin_stats()` - bỏ LIMIT 20, sửa logic ví
2. **`src/hooks/usePplpAdmin.ts`**: Thêm `wallet_address` vào `EcosystemTopUser` interface
3. **`src/components/admin/PplpMintTab.tsx`**: 
   - ScrollArea height 500px
   - Hiển thị địa chỉ ví rút gọn (0x1234...5678) 
   - 3 trạng thái icon ví (xanh/vàng/đỏ)
