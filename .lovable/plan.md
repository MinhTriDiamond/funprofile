

## Kế hoạch: Tạo nút "Cập nhật contract FUN Money" + chú thích hướng dẫn

### Mục tiêu
Thêm nút cho phép user tự động import token FUN Money vào ví (MetaMask/Trust Wallet) bằng 1 click, kèm dòng chú thích giải thích tại sao cần làm bước này.

### Thay đổi

**1. Tạo component `AddFunTokenButton.tsx`**
- Nút gradient cam "Cập nhật contract FUN Money" với icon ví
- Gọi `wallet_watchAsset` qua wagmi `useWalletClient` để thêm token FUN (ERC-20) vào ví user
- Params: address `0x39A1...0CD6`, symbol `FUN`, decimals `18`, logo FUN
- Toast thông báo thành công/thất bại
- Dòng chú thích bên dưới nút: *"Bạn cần cập nhật contract này vào ví để hiển thị đồng FUN. Token FUN thuộc mạng BNB Smart Chain Testnet (BSC Testnet)."*

**2. Tích hợp vào `FunBalanceCard.tsx`**
- Đặt nút + chú thích ngay dưới phần badge Contract/BSC Testnet hiện tại (dòng 124-127)
- Chỉ hiện khi user đã kết nối ví

### Chi tiết kỹ thuật
- Sử dụng `useWalletClient` từ wagmi để gọi `watchAsset`
- Fallback `window.ethereum.request` nếu walletClient không hỗ trợ
- Import contract info từ `@/config/pplp` (`FUN_MONEY_CONTRACT`)
- Thêm translation keys cho chú thích (VI + EN)

