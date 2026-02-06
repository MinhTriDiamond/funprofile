
# 🔧 Kế Hoạch Sửa Lỗi PPLP Tab Trang Trắng & Đồng Bộ UI

## 📋 Vấn Đề Đã Phát Hiện

### 1. Nguyên Nhân Chính: `WagmiProviderNotFoundError`
Từ screenshot console logs, lỗi **`WagmiProviderNotFoundError`** xảy ra khi click vào tab PPLP. Đây là do:
- `PplpMintTab.tsx` sử dụng các wagmi hooks: `useAccount()`, `useConnect()`, `useDisconnect()`
- `usePplpAdmin.ts` sử dụng: `useAccount()`, `useSignTypedData()`, `useWriteContract()`, `useWaitForTransactionReceipt()`
- Trang `/admin` (Admin.tsx) KHÔNG được wrap bởi `WagmiProvider`

### 2. Thiếu BSC Testnet trong Config
File `src/config/web3.ts` chỉ có:
```typescript
chains: [mainnet, bsc]  // ← Thiếu bscTestnet (chain ID 97)
```
Trong khi `src/config/pplp.ts` yêu cầu:
```typescript
chainId: 97  // BSC Testnet
```

### 3. Phân Mảnh Providers
Hiện tại có 3 `QueryClient` riêng biệt:
- `App.tsx` (line 31)
- `WalletProviders.tsx` (line 9)
- `WalletLoginProviders.tsx` (line 9)

Điều này gây:
- Không chia sẻ cache giữa các trang
- Wallet state không persist khi navigate
- Duplicate instances không cần thiết

---

## 🎯 Giải Pháp

### Chiến Lược: Globalize Web3 Providers
Wrap toàn bộ app với `WagmiProvider` và `RainbowKitProvider` ở cấp cao nhất (`App.tsx`), đảm bảo mọi trang đều có access vào Web3 context.

---

## 📁 Các File Cần Thay Đổi

### File 1: `src/config/web3.ts`
**Thêm BSC Testnet vào config:**
- Import `bscTestnet` từ `wagmi/chains`
- Thêm vào mảng `chains`
- Thêm transport cho `bscTestnet.id`

### File 2: `src/components/providers/Web3Provider.tsx` (TẠO MỚI)
**Tạo global Web3 provider component:**
- Wrap `WagmiProvider` với shared config
- Wrap `RainbowKitProvider` với theme
- Nhận `children` và `queryClient` từ parent (App.tsx)
- KHÔNG tạo QueryClient mới (tái sử dụng từ App.tsx)

### File 3: `src/App.tsx`
**Wrap toàn bộ app với Web3Provider:**
- Import và sử dụng `Web3Provider`
- Import RainbowKit styles
- Đặt Web3Provider bên trong `QueryClientProvider` (để chia sẻ QueryClient)

### File 4: `src/components/wallet/WalletProviders.tsx`
**Loại bỏ duplicate providers:**
- Xóa `WagmiProvider`, `QueryClientProvider`, `RainbowKitProvider`
- Giữ lại chỉ content component (`WalletCenterContainer`)
- Component này giờ sẽ dựa vào global providers từ App.tsx

### File 5: `src/components/auth/WalletLoginProviders.tsx`
**Loại bỏ duplicate providers:**
- Xóa `WagmiProvider`, `QueryClientProvider`, `RainbowKitProvider`
- Giữ lại chỉ content component với theme nếu cần
- Sử dụng global providers từ App.tsx

### File 6: `src/pages/Wallet.tsx`
**Cập nhật để sử dụng simplified WalletProviders:**
- Verify component vẫn hoạt động với global providers

---

## 🔧 Chi Tiết Kỹ Thuật

### Cấu Trúc Provider Mới

```text
App.tsx
├── LanguageProvider
│   └── QueryClientProvider (SHARED - single instance)
│       └── Web3Provider (NEW)
│           └── WagmiProvider
│               └── RainbowKitProvider
│                   └── TooltipProvider
│                       └── BrowserRouter
│                           └── Routes
│                               ├── /admin → Admin.tsx → PplpMintTab ✅ (has wagmi context)
│                               ├── /wallet → Wallet.tsx ✅ (has wagmi context)
│                               └── ... other routes
```

### web3.ts Update

```typescript
// BEFORE
import { mainnet, bsc } from 'wagmi/chains';
chains: [mainnet, bsc],
transports: {
  [mainnet.id]: http(),
  [bsc.id]: http(),
},

// AFTER
import { mainnet, bsc, bscTestnet } from 'wagmi/chains';
chains: [mainnet, bsc, bscTestnet],
transports: {
  [mainnet.id]: http(),
  [bsc.id]: http(),
  [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545/'),
},
```

### Web3Provider.tsx (New)

```typescript
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { config } from '@/config/web3';
import '@rainbow-me/rainbowkit/styles.css';

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
};
```

### App.tsx Update

```typescript
// Add import
import { Web3Provider } from '@/components/providers/Web3Provider';

// Wrap inside QueryClientProvider
<QueryClientProvider client={queryClient}>
  <Web3Provider>
    <TooltipProvider>
      {/* ... existing content */}
    </TooltipProvider>
  </Web3Provider>
</QueryClientProvider>
```

---

## 🌐 Đảm Bảo Đồng Bộ UI Giữa Các Môi Trường

### Preview vs Publish vs Production
Tất cả 3 môi trường đều sử dụng cùng codebase, nên sau khi fix:
- **Preview** (`preview--funprofile.lovable.app`): Sẽ hoạt động ngay sau deploy
- **Publish** (`funprofile.lovable.app`): Cần publish để cập nhật
- **Production** (`fun.rich`): Sẽ cập nhật khi publish

### Lỗi 404 cho `fun-profile-logo-40.webp`
Từ console logs, có lỗi 404 cho file này. Cần verify file tồn tại trong `/public/`.

---

## ⏱️ Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Update `web3.ts` với BSC Testnet | 2 min |
| 2 | Tạo `Web3Provider.tsx` | 5 min |
| 3 | Update `App.tsx` với global provider | 5 min |
| 4 | Simplify `WalletProviders.tsx` | 3 min |
| 5 | Simplify `WalletLoginProviders.tsx` | 3 min |
| 6 | Test và verify | 5 min |
| **Total** | | **~23 min** |

---

## ✅ Kết Quả Mong Đợi

| Trước | Sau |
|-------|-----|
| Tab PPLP → Trang trắng | Tab PPLP → Hiển thị UI đầy đủ |
| Wallet không persist khi navigate | Wallet state được giữ xuyên suốt app |
| 3 QueryClient instances | 1 shared QueryClient |
| Thiếu BSC Testnet | Có đủ BSC Testnet cho PPLP minting |
| WagmiProviderNotFoundError | Không còn lỗi |

---

## 🧪 Cách Test Sau Khi Fix

1. Truy cập `/admin` → Click tab "⚡ PPLP Mint"
2. Verify UI hiển thị đầy đủ (stats, tables, buttons)
3. Click "Kết nối Ví Attester" → MetaMask popup xuất hiện
4. Kiểm tra console không có lỗi `WagmiProviderNotFoundError`
5. Navigate giữa `/wallet` và `/admin` → Wallet state được giữ nguyên
