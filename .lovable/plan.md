

## Kiểm tra tính năng "Kết nối ví để gửi" trong Crypto Gift (Chat)

### Trạng thái hiện tại

Nút **"Kết nối"** trong Gift Dialog **hoạt động trên desktop** — nó gọi `openConnectModal()` từ RainbowKit (dòng 599 của `UnifiedGiftSendDialog.tsx`).

**Vấn đề trên mobile dApp browser**: Khi người dùng mở trang từ trình duyệt dApp (MetaMask, TrustWallet, Bitget), nút "Kết nối" vẫn gọi `openConnectModal()` — đây là modal RainbowKit, có thể gây xung đột z-index/portal hoặc hiển thị modal thừa, trong khi injected provider (`window.ethereum`) đã sẵn sàng.

Hệ thống Wallet Login (`WalletLoginContent.tsx`, `useWalletAuth.ts`) **đã xử lý đúng** trường hợp này bằng cách detect `isInjectedMobileBrowser()` rồi connect trực tiếp qua injected connector. Nhưng Gift Dialog **chưa áp dụng** cơ chế tương tự.

### Kế hoạch sửa

#### File: `src/components/donations/UnifiedGiftSendDialog.tsx`

1. Import `useConnect` từ wagmi và `isInjectedMobileBrowser` từ `mobileWalletConnect`
2. Thay `onConnectWallet={() => openConnectModal?.()}` bằng hàm thông minh:
   - Nếu đang trong dApp browser mobile → gọi `connect({ connector: injected() })` trực tiếp (bỏ qua modal RainbowKit)
   - Nếu không → gọi `openConnectModal()` như cũ

```tsx
// Thêm import
import { useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { isInjectedMobileBrowser } from '@/utils/mobileWalletConnect';

// Trong component, thêm hook
const { connect } = useConnect();

// Thay handler
const handleConnectWallet = useCallback(() => {
  if (isInjectedMobileBrowser()) {
    connect({ connector: injected() });
  } else {
    openConnectModal?.();
  }
}, [connect, openConnectModal]);

// Line 599: đổi từ
onConnectWallet={() => openConnectModal?.()}
// thành
onConnectWallet={handleConnectWallet}
```

Chỉ thay đổi **1 file**, không ảnh hưởng logic gửi token hay recording donation.

