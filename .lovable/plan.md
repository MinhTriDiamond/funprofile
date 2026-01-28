
# Kế Hoạch Sửa Lỗi Kết Nối FUN Wallet

## Phân Tích Vấn Đề

### Nguyên Nhân Không Kết Nối Được:

**FUN Wallet** (https://wallet-fun-rich.lovable.app) là một **ví web**, không phải ứng dụng mobile native. Cấu hình hiện tại đang dùng:
- Deep link: `funwallet://wc?uri=...` - CHỈ hoạt động với mobile apps
- WalletConnect protocol - yêu cầu ví phải implement WalletConnect SDK

### Vấn Đề Kỹ Thuật:
FUN Wallet cần implement WalletConnect protocol ở phía server để có thể nhận kết nối từ các dApp khác. Đây không phải thay đổi ở F.U. Profile, mà cần thay đổi ở **FUN Wallet project**.

## Giải Pháp

### Phương Án 1: Cập Nhật Redirect Flow (Khuyến nghị)

Thay vì dùng WalletConnect, sử dụng custom redirect flow để kết nối với FUN Wallet web:

1. Khi user click "FUN Wallet", mở popup/redirect đến FUN Wallet
2. User đăng nhập FUN Wallet và authorize kết nối
3. FUN Wallet redirect về F.U. Profile với wallet address đã sign

**Cấu hình mới:**
```typescript
// funWallet.ts - Sử dụng desktop redirect thay vì WalletConnect
export const funWallet = (): Wallet => ({
  id: 'fun-wallet',
  name: 'FUN Wallet',
  iconUrl: funWalletLogo,
  iconBackground: '#2E7D32',
  downloadUrls: {
    browserExtension: 'https://wallet-fun-rich.lovable.app',
  },
  // Desktop flow - mở web wallet
  desktop: {
    getUri: (uri: string) => {
      const callbackUrl = encodeURIComponent(window.location.origin + '/wallet');
      return `https://wallet-fun-rich.lovable.app/connect?callback=${callbackUrl}&wc_uri=${encodeURIComponent(uri)}`;
    },
  },
  // QR code vẫn dùng WalletConnect URI cho mobile scanning
  qrCode: {
    getUri: (uri: string) => uri,
    instructions: {
      learnMoreUrl: 'https://wallet-fun-rich.lovable.app',
      steps: [
        {
          description: 'Mở FUN Wallet trên trình duyệt',
          step: 'install',
          title: 'Mở FUN Wallet',
        },
        {
          description: 'Quét mã QR hoặc đăng nhập để kết nối',
          step: 'scan',
          title: 'Kết nối ví',
        },
      ],
    },
  },
  createConnector: getWalletConnectConnector({ projectId }),
});
```

### Phương Án 2: FUN Wallet Implement WalletConnect (Cần sửa ở FUN Wallet)

Để FUN Wallet hoạt động đúng với WalletConnect, cần:

1. **Ở FUN Wallet project**, thêm WalletConnect Web3Wallet SDK
2. Register FUN Wallet làm wallet trong WalletConnect Cloud
3. Implement session handling để sign transactions

Đây là thay đổi phức tạp hơn và cần chỉnh sửa FUN Wallet project.

## Chi Tiết Triển Khai (Phương Án 1)

### File cần sửa:

| File | Action | Mô tả |
|------|--------|-------|
| `src/config/funWallet.ts` | UPDATE | Thêm desktop redirect flow |

### Thay đổi code:

```typescript
// src/config/funWallet.ts
import { Wallet, getWalletConnectConnector } from '@rainbow-me/rainbowkit';
import funWalletLogo from '@/assets/fun-wallet-logo.png';

export interface FunWalletOptions {
  projectId: string;
}

const FUN_WALLET_URL = 'https://wallet-fun-rich.lovable.app';

export const funWallet = ({ projectId }: FunWalletOptions): Wallet => ({
  id: 'fun-wallet',
  name: 'FUN Wallet',
  iconUrl: funWalletLogo,
  iconBackground: '#2E7D32',
  downloadUrls: {
    browserExtension: FUN_WALLET_URL,
  },
  // Desktop: redirect to FUN Wallet web app
  desktop: {
    getUri: (uri: string) => {
      return `${FUN_WALLET_URL}/connect?wc_uri=${encodeURIComponent(uri)}`;
    },
  },
  // Mobile: deep link (nếu có mobile app trong tương lai)
  mobile: {
    getUri: (uri: string) => `funwallet://wc?uri=${encodeURIComponent(uri)}`,
  },
  qrCode: {
    getUri: (uri: string) => uri,
    instructions: {
      learnMoreUrl: FUN_WALLET_URL,
      steps: [
        {
          description: 'Mở FUN Wallet tại wallet-fun-rich.lovable.app',
          step: 'install',
          title: 'Mở FUN Wallet',
        },
        {
          description: 'Quét mã QR bằng tính năng WalletConnect trong FUN Wallet',
          step: 'scan',
          title: 'Quét mã QR',
        },
      ],
    },
  },
  createConnector: getWalletConnectConnector({ projectId }),
});
```

## Lưu Ý Quan Trọng

**Điều kiện để kết nối thành công:**

FUN Wallet (https://wallet-fun-rich.lovable.app) cần implement một trong các tính năng:

1. **WalletConnect Web3Wallet** - Để nhận và xử lý WalletConnect sessions
2. **Custom Connect Page** - `/connect` endpoint để xử lý callback từ F.U. Profile

Nếu FUN Wallet chưa có các tính năng này, kết nối sẽ không hoạt động dù sửa config phía F.U. Profile.

## Cập Nhật Logo

Tôi cũng sẽ cập nhật logo FUN Wallet từ file GIF bạn đã upload (download_10.gif).

## Tóm Tắt

1. **Cập nhật `funWallet.ts`** - Thêm desktop redirect flow đến FUN Wallet web
2. **Cập nhật logo** - Sử dụng logo mới từ upload
3. **Ghi chú**: FUN Wallet cũng cần implement WalletConnect hoặc custom connect endpoint để hoàn thiện flow kết nối
