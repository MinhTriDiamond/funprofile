

# Đánh giá yêu cầu "Universal Multi-Chain Wallet Engine"

## Phân tích hiện trạng — Hệ thống đã có sẵn rất nhiều

Sau khi rà soát kỹ toàn bộ codebase, hầu hết các tính năng được yêu cầu **ĐÃ ĐƯỢC TRIỂN KHAI**:

| Yêu cầu | Trạng thái | Chi tiết |
|----------|-----------|----------|
| MetaMask, WalletConnect, Trust Wallet | ✅ Đã có | RainbowKit + wagmi với MetaMask, Trust, Bitget, FUN wallet |
| Coinbase Wallet | ❌ Chưa có | Cần thêm vào config |
| BNB Smart Chain (BSC) | ✅ Đã có | BNB, USDT, BTCB, CAMLY, FUN tokens |
| Bitcoin (BTC native) | ✅ Đã có | `useBtcBalance` — Mempool.space + Blockstream fallback |
| Ethereum mainnet | ⚠️ Một phần | Chain đã khai báo trong wagmi config nhưng chưa hiển thị native ETH balance |
| Polygon | ❌ Chưa có | Chưa khai báo chain |
| Auto-refresh | ✅ Đã có | 60s cho BTC, 30s staleTime cho EVM, visibility refresh |
| Retry + fallback | ✅ Đã có | BTC: 2 retry + Blockstream fallback |
| Price fetching (USD) | ✅ Đã có | Edge function `token-prices` + localStorage cache |
| Loading states | ✅ Đã có | Skeleton loading cho mỗi token |
| Error handling | ✅ Đã có | Retry button, toast notifications |
| BTC balance = 0 bug | ✅ ĐÃ SỬA | Các phiên trước đã fix |
| Address validation | ✅ Đã có | `walletValidation.ts` |
| Security (no private keys) | ✅ Đã có | Chỉ dùng public address |

## Những gì CẦN bổ sung thực sự

### 1. Thêm Coinbase Wallet vào RainbowKit
**File**: `src/config/web3.ts`
- Import `coinbaseWallet` từ `@rainbow-me/rainbowkit/wallets`
- Thêm vào danh sách wallets

### 2. Thêm Polygon chain
**File**: `src/config/web3.ts`
- Import `polygon` từ `wagmi/chains`
- Thêm vào `chains` array và `transports`

### 3. Hiển thị native ETH balance trong AssetTab
**File**: `src/hooks/useTokenBalances.ts`
- Thêm `useBalance` cho ETH mainnet khi user đang ở mainnet
- Thêm ETH token vào mảng `tokens`
- Import ETH logo

**File**: `src/components/wallet/tabs/AssetTab.tsx`
- Hiển thị ETH khi chainId === 1

### 4. Hiển thị native MATIC/POL balance
**File**: `src/hooks/useTokenBalances.ts`
- Thêm `useBalance` cho Polygon khi user đang ở Polygon
- Thêm MATIC token vào mảng `tokens`

### 5. Tăng tần suất refresh cho EVM (từ 30s → 15s)
**File**: `src/config/web3.ts`
- Giảm `staleTime` xuống 15_000

### 6. Chain-aware token display
**File**: `src/hooks/useTokenBalances.ts`
- Thêm logic: nếu chainId === 1 (ETH mainnet) → hiển thị ETH + ERC20 tokens trên Ethereum
- Nếu chainId === 137 (Polygon) → hiển thị MATIC + tokens trên Polygon
- Giữ mặc định BSC như hiện tại

## Lưu ý quan trọng

Dự án Fun Profile được thiết kế **tập trung vào BSC** — toàn bộ luồng donation, gift, CAMLY, FUN token đều chạy trên BSC. Việc thêm ETH/Polygon sẽ:
- Tăng số lượng RPC calls đáng kể
- Có thể gây nhầm lẫn nếu user gửi token nhầm chain
- Cần thêm token contracts cho mỗi chain mới

## File cần sửa
```text
src/config/web3.ts                    — thêm Coinbase Wallet, Polygon chain
src/hooks/useTokenBalances.ts         — thêm ETH/MATIC native balance, chain-aware display
src/components/wallet/tabs/AssetTab.tsx — chain selector UI (nếu cần)
```

## Ước lượng: ~150 dòng code thay đổi

