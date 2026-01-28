
# Kế Hoạch Thêm FUN Wallet Vào Danh Sách Kết Nối Ví

## Phân Tích Yêu Cầu

Bạn muốn thêm **FUN Wallet** vào mục kết nối ví ngoài (External Wallet), bên cạnh MetaMask, Bitget, và Trust Wallet.

## Hiện Trạng

Cấu hình hiện tại trong `src/config/web3.ts`:
```typescript
const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [
      metaMaskWallet,
      trustWallet,
      bitgetWallet,
    ],
  },
], { ... });
```

## Giải Pháp: Tạo Custom Wallet cho FUN Wallet

RainbowKit hỗ trợ tạo custom wallet với WalletConnect. Tôi sẽ tạo một custom connector cho FUN Wallet.

## Chi Tiết Triển Khai

### Phần 1: Copy Logo FUN Wallet

**Action:** Copy logo FUN Wallet từ `user-uploads://image-93.png` vào `src/assets/fun-wallet-logo.png`

### Phần 2: Tạo Custom FUN Wallet Connector

**File mới:** `src/config/funWallet.ts`

```typescript
import { Wallet, getWalletConnectConnector } from '@rainbow-me/rainbowkit';

export interface FunWalletOptions {
  projectId: string;
}

export const funWallet = ({ projectId }: FunWalletOptions): Wallet => ({
  id: 'fun-wallet',
  name: 'FUN Wallet',
  iconUrl: '/fun-wallet-logo.png', // hoặc import từ assets
  iconBackground: '#2E7D32', // màu xanh lá phù hợp với branding
  downloadUrls: {
    // URL download FUN Wallet (nếu có)
    android: 'https://play.google.com/store/apps/details?id=fun.wallet',
    ios: 'https://apps.apple.com/app/fun-wallet',
    qrCode: 'https://funwallet.app',
  },
  mobile: {
    getUri: (uri: string) => `funwallet://wc?uri=${encodeURIComponent(uri)}`,
  },
  qrCode: {
    getUri: (uri: string) => uri,
    instructions: {
      learnMoreUrl: 'https://funwallet.app/learn-more',
      steps: [
        {
          description: 'Mở ứng dụng FUN Wallet trên điện thoại',
          step: 'install',
          title: 'Mở FUN Wallet',
        },
        {
          description: 'Quét mã QR để kết nối ví của bạn',
          step: 'scan',
          title: 'Quét mã QR',
        },
      ],
    },
  },
  createConnector: getWalletConnectConnector({ projectId }),
});
```

### Phần 3: Cập Nhật web3.ts Config

**File:** `src/config/web3.ts`

```typescript
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  trustWallet,
  bitgetWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { funWallet } from './funWallet'; // Import custom wallet
import { createConfig, http } from 'wagmi';
import { mainnet, bsc } from 'wagmi/chains';

const projectId = '21fef48091f12692cad574a6f7753643';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        trustWallet,
        bitgetWallet,
        funWallet, // Thêm FUN Wallet
      ],
    },
  ],
  {
    appName: 'F.U. Profile',
    projectId,
  }
);

// ... rest unchanged
```

### Phần 4: Cập Nhật WalletCenterContainer để nhận diện FUN Wallet

**File:** `src/components/wallet/WalletCenterContainer.tsx`

Thêm detection cho FUN Wallet trong `connectedWalletType`:

```typescript
const connectedWalletType = useMemo(() => {
  if (!connector) return null;
  const name = connector.name.toLowerCase();
  if (name.includes('metamask')) return 'metamask';
  if (name.includes('bitget')) return 'bitget';
  if (name.includes('trust')) return 'trust';
  if (name.includes('fun')) return 'fun'; // Thêm FUN Wallet
  return 'other';
}, [connector]);
```

### Phần 5: Cập Nhật WalletCard để hiển thị Logo FUN Wallet

**File:** `src/components/wallet/WalletCard.tsx`

Thêm import và logic cho FUN Wallet logo:

```typescript
import funWalletLogo from '@/assets/fun-wallet-logo.png';

// Trong getWalletLogo function
const getWalletLogo = (connectorType: string | null | undefined) => {
  switch (connectorType) {
    case 'metamask': return metamaskLogo;
    case 'bitget': return bitgetLogo;
    case 'trust': return trustWalletLogo;
    case 'fun': return funWalletLogo; // Thêm FUN Wallet
    default: return metamaskLogo;
  }
};
```

## Files Cần Tạo/Sửa

| File | Action | Mô tả |
|------|--------|-------|
| `src/assets/fun-wallet-logo.png` | COPY | Logo FUN Wallet từ upload |
| `src/config/funWallet.ts` | CREATE | Custom wallet connector cho FUN Wallet |
| `src/config/web3.ts` | UPDATE | Thêm FUN Wallet vào danh sách |
| `src/components/wallet/WalletCard.tsx` | UPDATE | Thêm logo detection |
| `src/components/wallet/WalletCenterContainer.tsx` | UPDATE | Thêm wallet type detection |

## Kết Quả Sau Khi Sửa

Khi nhấn **"Connect Wallet"**, modal RainbowKit sẽ hiển thị:

```
┌─────────────────────────────────┐
│     Connect a Wallet            │
├─────────────────────────────────┤
│  [MetaMask icon] MetaMask       │
│  [Trust icon] Trust Wallet      │
│  [Bitget icon] Bitget Wallet    │
│  [FUN icon] FUN Wallet   ← NEW  │
└─────────────────────────────────┘
```

Sau khi kết nối FUN Wallet, card External sẽ hiển thị đúng tên "FUN Wallet" với logo tương ứng.

## Lưu Ý Quan Trọng

FUN Wallet cần hỗ trợ **WalletConnect** để có thể kết nối qua RainbowKit. Nếu FUN Wallet là ví browser extension riêng (không qua WalletConnect), tôi sẽ cần điều chỉnh connector để inject trực tiếp như MetaMask.
