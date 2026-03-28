

## Sửa banner "Liên kết ví" vẫn hiện dù đã kết nối ví

### Nguyên nhân
- `useLoginMethods` kiểm tra `hasWalletLoginMethod = !!profileData?.external_wallet_address`
- Chỉ kiểm tra 1 trường `external_wallet_address`
- User có thể đã có ví ở `wallet_address`, `public_wallet_address`, hoặc `login_wallet_address` nhưng chưa có `external_wallet_address`
- → Banner vẫn hiện "Liên kết ví" dù user đã có ví

### Giải pháp
Sửa **1 file**: `src/hooks/useLoginMethods.ts`

- Thêm `wallet_address` và `login_wallet_address` vào query profile
- Đổi logic `hasWalletLoginMethod` thành kiểm tra **bất kỳ trường ví nào** có giá trị:
  ```
  hasWalletLoginMethod = !!(external_wallet_address || wallet_address || public_wallet_address || login_wallet_address)
  ```
- Khi bất kỳ trường ví nào đã có giá trị → coi là đã liên kết ví → banner không hiện nữa

### Quy mô
- 1 file sửa (`useLoginMethods.ts`)
- Không ảnh hưởng logic khác (security level, recommended action đều dựa trên `hasWalletLoginMethod`)

