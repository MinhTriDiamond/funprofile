# Kế hoạch: Tuỳ chỉnh danh sách ví trong RainbowKit

## Mục tiêu
- **Bỏ**: Safe, Rainbow, Base Account, WalletConnect
- **Giữ**: MetaMask, Coinbase
- **Thêm**: Trust Wallet, Bitget Wallet

## Thay đổi cần thực hiện

### File: `src/config/web3.ts`

**Hiện tại** (sử dụng default config - hiển thị tất cả ví):
```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, bsc } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'F.U. Profile',
  projectId: '21fef48091f12692cad574a6f7753643',
  chains: [mainnet, bsc],
  ssr: false,
});
```

**Sau khi sửa** (custom wallet list):
```typescript
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  trustWallet,
  bitgetWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { mainnet, bsc } from 'wagmi/chains';

const projectId = '21fef48091f12692cad574a6f7753643';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        trustWallet,
        bitgetWallet,
      ],
    },
  ],
  {
    appName: 'F.U. Profile',
    projectId,
  }
);

export const config = createConfig({
  connectors,
  chains: [mainnet, bsc],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
  },
});
```

## Giải thích

1. **Import các wallet cụ thể** từ `@rainbow-me/rainbowkit/wallets`:
   - `metaMaskWallet` - MetaMask
   - `coinbaseWallet` - Coinbase Wallet  
   - `trustWallet` - Trust Wallet
   - `bitgetWallet` - Bitget Wallet

2. **Sử dụng `connectorsForWallets`** để tạo danh sách ví tuỳ chỉnh thay vì `getDefaultConfig`

3. **Sử dụng `createConfig` từ wagmi** với các connectors đã tuỳ chỉnh

4. **Thêm transports** cho mỗi chain (bắt buộc khi dùng `createConfig`)

## Kết quả mong đợi

RainbowKit modal sẽ chỉ hiển thị 4 ví:
- MetaMask
- Coinbase Wallet
- Trust Wallet
- Bitget Wallet

Không còn hiển thị: Safe, Rainbow, Base Account, WalletConnect

## Critical Files for Implementation

- `src/config/web3.ts` - File config chính cần cập nhật để tuỳ chỉnh danh sách ví
