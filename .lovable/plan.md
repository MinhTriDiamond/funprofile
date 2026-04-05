

# Sửa lỗi mất kết nối ví khi tải lại trang trên điện thoại

## Nguyên nhân

Trong file `src/config/web3.ts`, hàm `createConfig` của wagmi **không cấu hình `storage`**. Mặc định wagmi v2 sử dụng `window.localStorage` trên desktop, nhưng trên một số trình duyệt di động (đặc biệt khi mở qua in-app browser của MetaMask, TrustWallet), localStorage có thể bị xóa hoặc không hoạt động đúng giữa các phiên.

Ngoài ra, `Web3Provider` không sử dụng `wagmiQueryClient` đã cấu hình — nó dùng `QueryClientProvider` từ App.tsx (queryClient riêng), nhưng wagmi cần `QueryClient` riêng được truyền vào `WagmiProvider`.

## Giải pháp

### 1. Thêm `storage` rõ ràng vào wagmi config (`src/config/web3.ts`)

Sử dụng `createStorage` từ wagmi với `localStorage` để đảm bảo trạng thái kết nối ví được lưu lại:

```ts
import { createConfig, createStorage, http } from 'wagmi';

export const config = createConfig({
  connectors,
  chains: [mainnet, bsc, bscTestnet, polygon],
  storage: createStorage({ storage: localStorage }),
  // ...transports
});
```

### 2. Thêm `reconnectOnMount` vào `WagmiProvider` (`src/components/providers/Web3Provider.tsx`)

Đảm bảo wagmi tự động kết nối lại ví khi tải trang:

```tsx
<WagmiProvider config={config} reconnectOnMount={true}>
```

Chỉ cần sửa **2 file**, mỗi file 1-2 dòng.

