

# Kế hoạch: Thêm Network Selector (BNB Mainnet / Testnet) cho Gift Send Dialog

## Tổng quan

Thêm khả năng chọn mạng BSC Mainnet (56) hoặc BSC Testnet (97) ngay trong form gửi tiền. Hệ thống sẽ hiển thị đúng số dư theo mạng, gửi giao dịch đúng chain, và hiện explorer link chính xác.

---

## Task 1: Tạo `src/lib/chainTokenMapping.ts` — Token address mapping theo chain

Tạo file config tập trung:

```typescript
// Chain IDs
export const BSC_MAINNET = 56;
export const BSC_TESTNET = 97;

// Token addresses per chain
// Tokens chưa deploy trên testnet sẽ có address = null → bị disabled trong UI
export const TOKEN_ADDRESS_BY_CHAIN: Record<number, Record<string, string | null>> = {
  [BSC_MAINNET]: {
    BNB: null, // native
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    FUN: '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6',
    CAMLY: '0x0910320181889feFDE0BB1Ca63962b0A8882e413',
  },
  [BSC_TESTNET]: {
    BNB: null,
    USDT: null,   // chưa deploy
    BTCB: null,   // chưa deploy
    FUN: '0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6', // giữ nguyên nếu đã deploy
    CAMLY: null,  // chưa deploy
  },
};

// Helper: lấy address token theo chain
export function getTokenAddress(symbol: string, chainId: number): string | null
// Helper: kiểm tra token có sẵn trên chain không
export function isTokenAvailableOnChain(symbol: string, chainId: number): boolean
// Helper: lấy BscScan base URL theo chainId
export function getBscScanBaseUrl(chainId: number): string
```

## Task 2: Tạo component `NetworkSelector.tsx`

UI dạng pill/toggle giữa "BNB Mainnet" và "BNB Testnet":
- Đặt ngay dưới phần "Chọn token"
- Hiển thị icon BNB + tên chain đang chọn
- Khi chọn Testnet: hint nhẹ "Testnet — chỉ để thử nghiệm"
- Props: `selectedChainId`, `onChainChange`, `walletChainId`

## Task 3: Cập nhật `UnifiedGiftSendDialog.tsx` — thêm state `selectedChainId`

Thay đổi chính:
- Thêm `selectedChainId` state, default dựa trên wallet chainId (56 hoặc 97, khác thì default 56)
- Balance queries dùng `selectedChainId` thay vì hardcode `bsc.id`
- Token address lấy từ `getTokenAddress(symbol, selectedChainId)` thay vì `selectedToken.address`
- Sửa `isWrongNetwork`: so sánh `chainId !== selectedChainId` (thay vì `!== bsc.id`)
- Sửa `onSwitchChain`: switch sang `selectedChainId`
- Khi chọn network mới: reset amount, refetch balance
- Khi token không available trên chain đã chọn: disable token đó trong TokenSelector
- BscScan URL dùng `getBscScanBaseUrl(selectedChainId)` thay vì logic cũ
- Truyền `selectedChainId` xuống `GiftFormStep` và `GiftConfirmStep`

## Task 4: Cập nhật `GiftFormStep.tsx` — tích hợp NetworkSelector + network warnings

- Render `NetworkSelector` giữa token selector và amount input
- Sửa logic warning:
  - Nếu `selectedChainId !== walletChainId` → "Ví đang ở [current], vui lòng chuyển sang [selected]" + Switch
  - Nếu `selectedChainId === walletChainId` → không hiện warning
  - Nếu `selectedChainId === 97` → hint: "Bạn đang dùng Testnet (thử nghiệm)"
- Token chưa available trên chain: hiện "(chưa deploy trên Testnet)" dưới balance

## Task 5: Cập nhật `TokenSelector.tsx` — hỗ trợ disabled tokens

- Thêm prop `disabledTokens?: string[]` — danh sách symbol bị disabled
- Token disabled: opacity thấp, không click được, tooltip "Chưa deploy trên Testnet"

## Task 6: Cập nhật `GiftConfirmStep.tsx` — hiển thị đúng chain info

- Thay "Chain: BSC (BNB Smart Chain)" → hiển thị đúng chain name theo `selectedChainId`
- BscScan link dùng đúng URL theo chain

## Task 7: Cập nhật `bscScanHelpers.ts` — thêm overload theo chainId

- Thêm function `getBscScanTxUrlByChain(txHash, chainId)` dùng chainId thay vì tokenSymbol
- Gift dialog sẽ dùng version mới này

## Task 8: Cập nhật `useSendToken.ts` — đảm bảo chain_id đúng

- DB insert `chain_id` đã dùng `chainId || 56` → giữ nguyên (wagmi chainId sẽ đúng sau switchChain)
- BscScan toast link cũng cần dùng chainId-based URL

---

## Files sẽ tạo/sửa

| File | Hành động |
|------|-----------|
| `src/lib/chainTokenMapping.ts` | **Tạo mới** |
| `src/components/donations/NetworkSelector.tsx` | **Tạo mới** |
| `src/components/donations/UnifiedGiftSendDialog.tsx` | Sửa |
| `src/components/donations/gift-dialog/GiftFormStep.tsx` | Sửa |
| `src/components/donations/gift-dialog/GiftConfirmStep.tsx` | Sửa |
| `src/components/donations/TokenSelector.tsx` | Sửa |
| `src/lib/bscScanHelpers.ts` | Sửa |

