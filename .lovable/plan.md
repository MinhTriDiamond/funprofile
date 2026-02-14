

## Xoá hoàn toàn ví lưu ký (Custodial Wallet / Ví F.U.)

### Tong quan
Gỡ bỏ toàn bộ giao diện và logic liên quan đến ví lưu ký (custodial wallet / Ví F.U.), chỉ giữ lại ví do người dùng tự cập nhật (public_wallet_address).

### Thay doi

#### 1. Xoá file: `src/components/wallet/WalletManagement.tsx`
- Toàn bộ component này chỉ phục vụ ví custodial -> xoá hoàn toàn

#### 2. Xoá edge function: `supabase/functions/create-custodial-wallet/index.ts`
- Edge function tạo ví custodial không còn cần thiết

#### 3. Cập nhật: `src/components/wallet/WalletSettingsDialog.tsx`
- Xoá import `WalletManagement`
- Xoá tab "Quản lý ví" (chỉ giữ tab "Cài đặt")
- Xoá interface `WalletProfile` và state `walletProfile`, `isLoadingProfile`
- Xoá hàm `loadWalletProfile`
- Bỏ `Tabs` wrapper, chỉ render nội dung Settings trực tiếp

#### 4. Cập nhật: `src/components/wallet/WalletCenterContainer.tsx`
- Xoá interface `WalletProfile` chứa `custodial_wallet_address`
- Xoá state và logic fetch `custodial_wallet_address` từ profiles
- Xoá mọi tham chiếu đến custodial wallet

#### 5. Cập nhật: `src/hooks/useUserDirectory.ts`
- Xoá `custodial_wallet_address` khỏi select query
- Xoá fallback `|| profile.custodial_wallet_address` trong logic gán `wallet_address`

### Ket qua
- Giao diện Wallet Settings chỉ còn phần Cài đặt (hiển thị, bảo mật, thông báo)
- Không còn bất kỳ tham chiếu nào đến ví lưu ký trong toàn bộ ứng dụng
- Hệ thống chỉ sử dụng `public_wallet_address` do người dùng tự cập nhật

