
## Mở lại tính năng Mint FUN Money (Tắt Maintenance Mode)

### Vấn đề
Tab "Mint Fun Money" tại `/wallet/fun_money` hiển thị thông báo **"Hệ thống tạm dừng bảo trì"** vì có 2 component đang bật cờ `IS_MAINTENANCE = true`:

1. **`ClaimRewardsCard.tsx`** — Card đúc FUN từ pending actions (hiện đang block hoàn toàn)
2. **`ClaimFunDialog.tsx`** — Dialog rút FUN về ví on-chain (cũng đang block)

### Giải pháp
Đổi cờ `IS_MAINTENANCE` từ `true` → `false` trong cả 2 file:

**File 1: `src/components/wallet/ClaimRewardsCard.tsx`** (dòng 59)
```ts
// Trước:
const IS_MAINTENANCE = true;

// Sau:
const IS_MAINTENANCE = false;
```

**File 2: `src/components/wallet/ClaimFunDialog.tsx`** (dòng 44)
```ts
// Trước:
const IS_MAINTENANCE = true;

// Sau:
const IS_MAINTENANCE = false;
```

### Lưu ý
- `UnifiedGiftSendDialog.tsx` (chuyển tiền P2P) đã có `IS_MAINTENANCE = false` rồi — không cần thay đổi.
- Contract address `0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6` trên BSC Testnet (Chain ID 97) đã được cấu hình đúng trong `src/config/pplp.ts`.
- Sau khi mở, người dùng sẽ có thể thực hiện đúc FUN từ Light Actions đã được duyệt và rút FUN về ví on-chain.
