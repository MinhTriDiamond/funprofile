

## Tắt tính năng liên kết ví tự động trên giao diện

### Vấn đề
Tính năng "Ví đã liên kết" từ backend đang hiển thị sai thông tin trên mobile — lấy địa chỉ ví từ profile rồi coi như đã liên kết, nhưng thực tế không đúng. User muốn tự kết nối ví bằng nút bên dưới.

### Giải pháp
Revert logic linked wallet fallback — chỉ hiển thị ví khi user thực sự kết nối trên thiết bị.

### Thay đổi

**1. `src/components/wallet/WalletCenterContainer.tsx`**
- Bỏ import `useLinkedWallet`
- Bỏ `hasLinkedWallet`, `linkedWalletAddress` khỏi logic
- `externalAddress` và `displayWalletAddress` chỉ dùng `activeAddress || address` (không fallback linked)
- Điều kiện hiện full-screen "chưa kết nối" quay lại: `!isConnected && showDisconnectedUI` (bỏ `&& !hasLinkedWallet`)
- `walletName` không hiện "Ví đã liên kết"
- `isDeviceConnected` và `hasLinkedWallet` truyền xuống AssetTab/RewardTab đều = false hoặc bỏ

**2. `src/components/wallet/WalletCard.tsx`**
- Bỏ badge "Đã liên kết" và "Chưa kết nối thiết bị"
- Bỏ banner "Ví đã liên kết với tài khoản. Kết nối ví trên thiết bị này..."
- Bỏ logic `isLinkedOnly` — các action button hoạt động bình thường
- Giữ badge đơn giản: "Đã kết nối" / "Chưa kết nối"

**3. `src/components/wallet/tabs/AssetTab.tsx`**
- Bỏ props `isDeviceConnected` và `hasLinkedWallet` nếu không cần truyền xuống WalletCard nữa

**4. `src/hooks/useLinkedWallet.ts`**
- Giữ file lại (không xoá) vì có thể dùng lại sau, nhưng không import ở đâu nữa

### Kết quả
- Mobile sẽ hiện đúng: nếu chưa kết nối ví → hiện màn hình kết nối ví → user tự bấm nút kết nối
- Không còn hiện sai "Ví đã liên kết" khi chưa thực sự kết nối trên thiết bị

