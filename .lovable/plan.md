
# Kế Hoạch: Xây Dựng Tính Năng Gửi/Nhận USDT & BTCB (BSC)

## Tổng Quan

Mở rộng tính năng ví FUN Profile để hỗ trợ gửi/nhận USDT và BTCB trên BSC Mainnet, tái sử dụng pattern hiện có từ TokenSelector, useDonation và useTokenBalances.

## Phân Tích Hiện Trạng

### Đã có sẵn
| Component | Mô tả |
|-----------|-------|
| `TokenSelector.tsx` | UI chọn token (FUN, CAMLY, BNB) |
| `useTokenBalances.ts` | Hook lấy balance các token (đã có USDT, BTCB) |
| `useDonation.ts` | Logic gửi BNB/ERC20 với sendTransaction |
| `SendTab.tsx` | UI gửi BNB cơ bản |
| `ReceiveTab.tsx` | UI nhận với QR code |
| `transactions` table | Bảng lưu lịch sử giao dịch |
| `bscScanHelpers.ts` | Utility tạo link BscScan |
| Token logos | `usdt-logo.webp`, `btcb-logo.webp` |

### Cần bổ sung
- Thêm USDT, BTCB vào `TokenSelector`
- Nâng cấp `SendTab` với token selector, gas estimation, confirm modal
- Tạo module `erc20.ts` tập trung logic ERC20
- Tạo component Recent Transactions với status tracking
- Thêm logic bắt buộc BSC Mainnet (chainId=56) + nút Switch Network

## Kiến Trúc Giải Pháp

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WALLET PAGE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │     SEND TAB         │  │    RECEIVE TAB       │  │  TRANSACTIONS     │  │
│  │  • Token Selector    │  │  • QR Code           │  │  • Recent list    │  │
│  │  • Amount + MAX      │  │  • Copy address      │  │  • Status badge   │  │
│  │  • Recipient input   │  │  • Share             │  │  • Refresh btn    │  │
│  │  • Gas estimate      │  │                      │  │  • BscScan link   │  │
│  │  • Confirm modal     │  │                      │  │                   │  │
│  └──────────────────────┘  └──────────────────────┘  └───────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                        NETWORK GUARD                                        │
│     ⚠️ If chainId ≠ 56 → Show "Switch to BSC" button                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Chi Tiết Files Cần Thay Đổi

### 1. Tạo mới: `src/lib/tokens.ts`

**Mục đích:** Centralize danh sách token metadata

```typescript
export const WALLET_TOKENS = [
  { symbol: 'BNB', name: 'BNB', address: null, decimals: 18, logo: bnbLogo },
  { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, logo: usdtLogo },
  { symbol: 'BTCB', name: 'Bitcoin BEP20', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, logo: btcbLogo },
  { symbol: 'FUN', name: 'FUN Money', address: '0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2', decimals: 18, logo: funLogo },
  { symbol: 'CAMLY', name: 'Camly Coin', address: '0x0910320181889feFDE0BB1Ca63962b0A8882e413', decimals: 3, logo: camlyLogo },
];
```

### 2. Tạo mới: `src/lib/erc20.ts`

**Mục đích:** Helper functions cho ERC20

```typescript
// Minimal ERC20 ABI
export const ERC20_ABI = [
  { name: 'balanceOf', ... },
  { name: 'decimals', ... },
  { name: 'transfer', ... },
  { name: 'allowance', ... },
];

// Helper: Encode transfer call
export function encodeTransfer(to: string, amount: bigint): string { ... }

// Helper: Get decimals với fallback
export async function getTokenDecimals(address: string, publicClient): Promise<number> { ... }
```

### 3. Sửa: `src/components/donations/TokenSelector.tsx`

**Thay đổi:** Thêm USDT và BTCB vào SUPPORTED_TOKENS

```typescript
import usdtLogo from '@/assets/tokens/usdt-logo.webp';
import btcbLogo from '@/assets/tokens/btcb-logo.webp';

export const SUPPORTED_TOKENS: TokenOption[] = [
  { symbol: 'BNB', ... },
  { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, logo: usdtLogo, color: 'from-emerald-500 to-green-400' },
  { symbol: 'BTCB', name: 'Bitcoin BEP20', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, logo: btcbLogo, color: 'from-orange-500 to-amber-400' },
  { symbol: 'FUN', ... },
  { symbol: 'CAMLY', ... },
];
```

### 4. Thay thế: `src/components/wallet/SendTab.tsx`

**Nâng cấp toàn diện:**

- Token Selector dropdown (BNB, USDT, BTCB, FUN, CAMLY)
- Balance display realtime
- Input amount với nút MAX:
  - BNB: `balance - 0.002` (gas buffer)
  - Tokens: full balance
- Recipient address input với validation EVM checksum
- Gas estimation display
- Cảnh báo nếu không đủ BNB trả gas
- Cảnh báo nếu gửi số lượng lớn (>80% balance)
- Modal xác nhận trước gửi
- Network guard: BSC Mainnet only

```text
┌─────────────────────────────────────────────────────────┐
│  GỬI TOKEN                                              │
├─────────────────────────────────────────────────────────┤
│  Token: [USDT ▼]                                        │
│  Balance: 1,234.56 USDT                                 │
├─────────────────────────────────────────────────────────┤
│  Địa chỉ nhận: [0x...                         ]         │
│  ✓ Địa chỉ hợp lệ                                       │
├─────────────────────────────────────────────────────────┤
│  Số lượng: [100        ] [MAX]  USDT                    │
│  ≈ $100.00 USD                                          │
├─────────────────────────────────────────────────────────┤
│  ⛽ Gas estimate: ~0.0005 BNB ($0.35)                    │
│  ⚠️ BNB để trả gas: 0.01 BNB (đủ)                        │
├─────────────────────────────────────────────────────────┤
│  [HỦY]              [XÁC NHẬN GỬI]                      │
└─────────────────────────────────────────────────────────┘
```

### 5. Tạo mới: `src/components/wallet/SendConfirmModal.tsx`

**Modal xác nhận gửi:**

```typescript
interface SendConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  token: TokenOption;
  amount: string;
  recipient: string;
  gasEstimate: string;
  isLoading: boolean;
}
```

- Hiển thị: Token logo, số lượng, địa chỉ nhận (truncated + copy), network = BSC
- Nút Confirm/Cancel
- Loading state khi đang xử lý

### 6. Tạo mới: `src/hooks/useSendToken.ts`

**Hook xử lý gửi token:**

```typescript
export function useSendToken() {
  const { sendTransactionAsync } = useSendTransaction();
  
  async function sendToken(params: {
    token: TokenOption;
    recipient: string;
    amount: string;
  }): Promise<{ txHash: string } | null> {
    // Validate recipient
    // Parse amount theo decimals
    // Native BNB: sendTransaction
    // ERC20: encode transfer + sendTransaction
    // Save to transactions table
    // Return txHash
  }
  
  return { sendToken, isPending };
}
```

### 7. Tạo mới: `src/components/wallet/RecentTransactions.tsx`

**Component lịch sử giao dịch:**

```text
┌─────────────────────────────────────────────────────────┐
│  LỊCH SỬ GIAO DỊCH                          [🔄 Refresh]│
├─────────────────────────────────────────────────────────┤
│  🟢 100 USDT → 0x1234...5678                            │
│     2 phút trước • Confirmed                            │
│     [🔗 BscScan]                                        │
├─────────────────────────────────────────────────────────┤
│  🟡 0.5 BNB → 0xabcd...efgh                             │
│     5 phút trước • Pending                              │
│     [🔗 BscScan]                                        │
├─────────────────────────────────────────────────────────┤
│  🔴 50 BTCB → 0x9876...5432                             │
│     1 giờ trước • Failed                                │
│     [🔗 BscScan]                                        │
└─────────────────────────────────────────────────────────┘
```

- Lấy từ bảng `transactions`
- Status badge: pending (🟡), confirmed (🟢), failed (🔴)
- Nút Refresh để check transaction receipt
- Link BscScan mỗi giao dịch

### 8. Tạo mới: `src/hooks/useTransactionHistory.ts`

**Hook quản lý lịch sử:**

```typescript
export function useTransactionHistory() {
  // Lấy transactions từ Supabase
  // Function refresh status từng tx
  // Real-time subscription (optional)
  
  async function refreshTxStatus(txHash: string) {
    // Call publicClient.getTransactionReceipt
    // Update status trong DB
  }
  
  return { transactions, isLoading, refreshTxStatus };
}
```

### 9. Sửa: `src/components/wallet/WalletCenterContainer.tsx`

**Thêm:**

- Import RecentTransactions component
- Network guard logic cho BSC Mainnet
- Tab/section cho Recent Transactions

### 10. Sửa: `src/lib/bscScanHelpers.ts`

**Thêm hỗ trợ USDT, BTCB:**

```typescript
// Đã có sẵn logic Mainnet cho non-FUN tokens
// Chỉ cần verify USDT, BTCB đi vào Mainnet URL
```

## Flow Xử Lý Gửi Token

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SEND TOKEN FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. User chọn token (USDT/BTCB/BNB/FUN/CAMLY)                                │
│    → Hiển thị balance từ useTokenBalances                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. User nhập địa chỉ nhận                                                   │
│    → validateEvmAddress() kiểm tra checksum                                 │
│    → Block nếu gửi cho chính mình (tùy chọn)                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. User nhập số lượng hoặc bấm MAX                                          │
│    → BNB: balance - 0.002                                                   │
│    → Token: full balance                                                    │
│    → Hiển thị USD value                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Check điều kiện                                                          │
│    → chainId = 56? Nếu không → Switch to BSC button                         │
│    → Đủ BNB trả gas? Nếu không → Cảnh báo                                   │
│    → Gửi >80% balance? → Cảnh báo số lượng lớn                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. User bấm Gửi → Mở Confirm Modal                                          │
│    → Hiển thị: Token, Amount, Recipient, Network, Gas estimate              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. User Confirm → Gọi sendToken()                                           │
│    → BNB: sendTransactionAsync({ to, value })                               │
│    → Token: encode transfer() + sendTransactionAsync({ to, data })          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. Wait 1 confirmation                                                      │
│    → Save to transactions table (status: pending)                           │
│    → Show toast với link BscScan                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 8. Update status khi confirmed                                              │
│    → Update transactions.status = 'confirmed'                               │
│    → Toast success                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Xử Lý Lỗi

| Lỗi | Xử lý |
|-----|-------|
| User reject signature | Toast: "Giao dịch đã bị từ chối" |
| Insufficient gas (BNB) | Toast: "Không đủ BNB để trả phí gas. Cần tối thiểu 0.002 BNB" |
| Transfer reverted | Toast: "Giao dịch thất bại. Vui lòng kiểm tra số dư" |
| RPC error | Toast: "Lỗi kết nối mạng. Vui lòng thử lại" |
| Invalid address | Inline error: "Địa chỉ không hợp lệ" |
| Wrong network | Banner: "Vui lòng chuyển sang BNB Smart Chain" + Switch button |

## Danh Sách Files

| File | Hành động |
|------|-----------|
| `src/lib/tokens.ts` | **Tạo mới** |
| `src/lib/erc20.ts` | **Tạo mới** |
| `src/components/donations/TokenSelector.tsx` | **Sửa** - Thêm USDT, BTCB |
| `src/components/wallet/SendTab.tsx` | **Sửa** - Nâng cấp toàn diện |
| `src/components/wallet/SendConfirmModal.tsx` | **Tạo mới** |
| `src/hooks/useSendToken.ts` | **Tạo mới** |
| `src/components/wallet/RecentTransactions.tsx` | **Tạo mới** |
| `src/hooks/useTransactionHistory.ts` | **Tạo mới** |
| `src/components/wallet/WalletCenterContainer.tsx` | **Sửa** - Thêm Recent Transactions, Network guard |

## Kết Quả Mong Đợi

- Gửi/nhận USDT và BTCB hoạt động trên BSC Mainnet
- UI Send có token selector, MAX button, gas estimation
- Modal xác nhận trước khi gửi
- Network guard bắt buộc BSC Mainnet
- Recent Transactions với status tracking và BscScan links
- Xử lý lỗi rõ ràng, thông báo dễ hiểu
- Tái sử dụng tối đa code hiện có (useTokenBalances, bscScanHelpers, validateEvmAddress)

## Ghi Chú Kỹ Thuật

- Gas buffer cho BNB: 0.002 BNB (tránh fail do thiếu gas)
- Decimals: Ưu tiên đọc on-chain, fallback = 18
- Chain enforcement: chainId phải = 56 (BSC Mainnet) cho mọi giao dịch
- Transaction status tracking: Log vào DB, check receipt để update status
- BscScan URLs: USDT/BTCB → Mainnet (`bscscan.com`), FUN → Testnet (giữ nguyên logic hiện tại)
