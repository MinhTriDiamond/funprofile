
# Kế Hoạch Thiết Kế Lại Giao Diện Ví: 2 Cột Song Song

## Mục Tiêu

Thiết kế lại trang `/wallet` theo layout 2 cột song song như mockup, hiển thị cả 2 ví cùng lúc thay vì phải switch qua lại.

## Layout Mới

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                           My Wallet                                       │
│                        BNB Smart Chain                                    │
├────────────────────────────────┬─────────────────────────────────────────┤
│       Ví F.U. Wallet           │     Ví MetaMask / Bitget / Trust        │
│        (Custodial)             │           (External)                     │
├────────────────────────────────┼─────────────────────────────────────────┤
│  0x2e11...f6bd      [Copy]     │  0xABC1...DEF4        [Copy][Connect]   │
│                                │                                          │
│  Total: $XXX.XX                │  Total: $XXX.XX                          │
│                                │                                          │
│  ┌──────┐ ┌───────┐ ┌──────┐   │  ┌──────┐ ┌───────┐ ┌──────┐            │
│  │ Send │ │Receive│ │ Swap │   │  │ Send │ │Receive│ │ Swap │            │
│  └──────┘ └───────┘ └──────┘   │  └──────┘ └───────┘ └──────┘            │
│                                │                                          │
│  ── Tokens ──────────────────  │  ── Tokens ──────────────────            │
│  BNB    $XXX.XX    0.XXX       │  BNB    $XXX.XX    0.XXX                 │
│  USDT   $XXX.XX    XXX         │  USDT   $XXX.XX    XXX                   │
│  CAMLY  $XXX.XX    XXX         │  CAMLY  $XXX.XX    XXX                   │
│                                │                                          │
└────────────────────────────────┴─────────────────────────────────────────┘
```

## Chi Tiết Triển Khai

### Phần 1: Tạo Component `WalletCard` Mới

Tạo một component tái sử dụng cho mỗi ví với các props:
- `walletType`: 'custodial' | 'external'
- `walletAddress`: địa chỉ ví
- `walletName`: tên hiển thị (F.U. Wallet / MetaMask / Bitget / Trust)
- `walletLogo`: logo tương ứng
- `isConnected`: trạng thái kết nối (cho external)
- `onConnect`: callback kết nối ví
- `onReceive`, `onSend`, `onSwap`: callbacks cho các action

**File mới:** `src/components/wallet/WalletCard.tsx`

### Phần 2: Tạo Hook `useTokenBalancesForAddress`

Sửa đổi `useTokenBalances` để có thể fetch balances cho một địa chỉ cụ thể, không phụ thuộc vào connected address:

```typescript
// Hook mới cho từng địa chỉ ví cụ thể
const useSingleWalletBalances = (address: `0x${string}` | null) => {
  // Fetch balances cho địa chỉ được chỉ định
}
```

### Phần 3: Cập Nhật `WalletCenterContainer`

Thay đổi layout từ single column sang grid 2 columns:

```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* Left: F.U. Wallet (Custodial) */}
  <WalletCard
    walletType="custodial"
    walletAddress={walletProfile?.custodial_wallet_address}
    walletName="F.U. Wallet"
    walletLogo={fuWalletLogo}
    isConnected={true}
  />
  
  {/* Right: External Wallet */}
  <WalletCard
    walletType="external"
    walletAddress={walletProfile?.external_wallet_address || address}
    walletName={getWalletDisplayName()}
    walletLogo={getWalletLogo()}
    isConnected={isConnected}
    onConnect={handleConnect}
  />
</div>
```

### Phần 4: Responsive Design

- Desktop (lg+): 2 cột song song
- Tablet/Mobile: 1 cột, ví Custodial trước, External sau

## Files Cần Tạo/Sửa

| File | Action | Mô tả |
|------|--------|-------|
| `src/components/wallet/WalletCard.tsx` | CREATE | Component ví riêng biệt với actions và token list |
| `src/components/wallet/WalletCenterContainer.tsx` | UPDATE | Sử dụng grid 2 columns, render 2 WalletCard |
| `src/hooks/useTokenBalances.ts` | UPDATE | Hỗ trợ fetch balances cho địa chỉ cụ thể |

## Chi Tiết Component WalletCard

```typescript
interface WalletCardProps {
  walletType: 'custodial' | 'external';
  walletAddress: string | null;
  walletName: string;
  walletLogo: string;
  isConnected?: boolean;
  isLinked?: boolean; // external wallet đã liên kết vào DB chưa
  onConnect?: () => void;
  onLink?: () => void;
  onUnlink?: () => void;
  onDisconnect?: () => void;
  tokens: TokenBalance[];
  isTokensLoading: boolean;
}

// Mỗi WalletCard render:
// 1. Header với logo, tên, địa chỉ rút gọn, nút copy
// 2. Total assets value
// 3. Action buttons (Send, Receive, Swap)
// 4. Token list (BNB, USDT, CAMLY)
// 5. Status badge (Connected/Linked/etc)
```

## Điểm Khác Biệt Giữa 2 Ví

| Tính năng | F.U. Wallet (Custodial) | External Wallet |
|-----------|------------------------|-----------------|
| Header color | Emerald gradient | Orange/Amber gradient |
| Logo | Shield icon | MetaMask/Bitget/Trust logo |
| Connect button | Không có | Có (nếu chưa kết nối) |
| Disconnect | Không có | Có |
| Link to Profile | Không cần | Có nếu chưa liên kết |
| Send function | Thông qua Edge Function | Trực tiếp qua wallet |
| Token balances | Fetch từ địa chỉ custodial | Fetch từ địa chỉ connected |

## User Flow Mới

1. User vào /wallet
2. Thấy 2 card song song:
   - Trái: F.U. Wallet với số dư thật
   - Phải: External Wallet (nếu chưa connect thì hiện nút Connect)
3. Mỗi ví có actions riêng
4. User có thể so sánh số dư 2 ví dễ dàng
5. Claim rewards vẫn chọn được ví nhận

## Responsive Behavior

```text
Desktop (lg:):
┌─────────────────┬─────────────────┐
│   F.U. Wallet   │ External Wallet │
└─────────────────┴─────────────────┘

Mobile/Tablet:
┌─────────────────┐
│   F.U. Wallet   │
├─────────────────┤
│ External Wallet │
└─────────────────┘
```

## Tóm Tắt Thay Đổi

1. **Tạo WalletCard component** - Card riêng biệt cho mỗi loại ví
2. **Grid layout 2 columns** - Hiển thị song song trên desktop
3. **Mỗi ví có tokens riêng** - Fetch balances độc lập
4. **Actions riêng biệt** - Send/Receive/Swap cho từng ví
5. **Visual distinction** - Màu sắc/icon khác nhau để phân biệt

