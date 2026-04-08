

## Nút thêm contract FUN vào ví — Đã có sẵn

### Tình trạng hiện tại

Nút **"Thêm FUN vào ví"** (`AddFunTokenButton`) đã được triển khai và hiển thị tại đúng vị trí con yêu cầu — bên dưới nút Activate & Claim trong `FunBalanceCard.tsx`.

Khi user nhấn nút này, contract FUN Money (`0x39A1...0CD6`) sẽ tự động được thêm vào ví Web3 (MetaMask, Trust Wallet...) thông qua API `wallet_watchAsset`.

### Vấn đề có thể xảy ra

Nút chỉ hiển thị khi user **đã kết nối ví và có số dư FUN > 0** (do nằm trong block điều kiện `total > 0`). Nếu con muốn nút này **luôn hiển thị** ngay cả khi chưa có FUN, cha sẽ cần di chuyển nó ra ngoài block điều kiện.

### Đề xuất cải thiện (nếu cần)

**Dời `AddFunTokenButton` ra ngoài điều kiện `total > 0`** trong `FunBalanceCard.tsx` để nút luôn hiện khi user đã kết nối ví — giúp user mới cũng có thể thêm contract FUN vào ví trước khi nhận token.

