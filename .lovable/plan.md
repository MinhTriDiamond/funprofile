

## Sửa lỗi "n.connector.getChainId is not a function" khi tặng tiền

### Nguyên nhân

Lỗi xảy ra do wagmi v2 gọi `connector.getChainId()` khi tham số `chainId` được truyền vào `sendTransactionAsync()`. Một số connector (đặc biệt MetaMask trên desktop) không triển khai method này, gây crash.

Có 2 file truyền `chainId` vào `sendTransactionAsync`:
- `src/hooks/useDonation.ts` (dòng 94, 111) — luồng tặng tiền
- `src/hooks/useSendToken.ts` (dòng 119, 126) — luồng gửi token

### Thay đổi

**1. `src/hooks/useDonation.ts`** — Xóa `chainId` khỏi 2 lệnh `sendTransactionAsync`
- Dòng 94: bỏ `chainId: chainId || 56`
- Dòng 111: bỏ `chainId: chainId || 56`
- Wagmi sẽ tự dùng chain hiện tại của connector

**2. `src/hooks/useSendToken.ts`** — Xóa `chainId` khỏi 2 lệnh `sendTransactionAsync`
- Dòng 119: bỏ `chainId: chainId || 56`
- Dòng 126: bỏ `chainId: chainId || 56`

Hook `useAutoChainSwitch` đã đảm bảo user ở đúng chain (BSC) trước khi giao dịch, nên không cần truyền `chainId` thủ công.

