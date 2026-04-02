

# Bổ sung mạng Bitcoin vào Network Selector + Hiển thị lịch sử BTC

## Vấn đề
1. Dropdown chọn mạng (Hình 1) chỉ có "BNB Mainnet (56)" và "BSC Testnet (97)" — cần thêm "Bitcoin"
2. Lịch sử giao dịch cá nhân và trang lịch sử chính cần hiển thị đầy đủ giao dịch BTC

## Thay đổi

### 1) `src/components/wallet/WalletCenterContainer.tsx` — Thêm Bitcoin vào network selector

**a) Thêm state `selectedNetwork`** để quản lý view mode (vì Bitcoin không phải EVM chain, không thể switch qua wagmi):
- `'evm'` (mặc định) — hiển thị như hiện tại theo chainId EVM
- `'bitcoin'` — hiển thị thông tin BTC

**b) Mở rộng `networkConfig`** để hỗ trợ Bitcoin:
- Khi `selectedNetwork === 'bitcoin'`: name = "Bitcoin", badge cam, logo BTC

**c) Thêm DropdownMenuItem "Bitcoin"** trong dropdown menu:
- Click → set `selectedNetwork = 'bitcoin'` (không gọi `switchChain`)
- Hiển thị check icon khi đang chọn Bitcoin
- Import `btcLogo` thay cho `bnbLogo` khi ở chế độ Bitcoin

**d) Truyền thêm prop `selectedNetwork` xuống HistoryTab** để filter theo chain

### 2) `src/components/wallet/tabs/HistoryTab.tsx` — Filter theo chain

- Nhận thêm prop `selectedNetwork?: 'evm' | 'bitcoin'`
- Khi `selectedNetwork === 'bitcoin'`: chỉ hiển thị donations/transfers có `token_symbol === 'BTC'` hoặc `chain_id === 0`
- Khi `selectedNetwork === 'evm'`: hiển thị tất cả trừ BTC (hoặc hiển thị tất cả — tuỳ logic, mặc định hiển thị tất cả)
- Summary table cũng filter tương ứng

### 3) `src/components/wallet/tabs/AssetTab.tsx` — Ẩn/hiện theo network

- Nhận prop `selectedNetwork`
- Khi `selectedNetwork === 'bitcoin'`: chỉ hiển thị section Bitcoin (btc_address, BTC balance)
- Khi `selectedNetwork === 'evm'`: hiển thị assets EVM như hiện tại

### 4) `src/components/donations/SystemDonationHistory.tsx` — Trang lịch sử chính

- Thêm filter "Chain" (dropdown): "Tất cả" / "BSC" / "Bitcoin"
- Khi chọn "Bitcoin": filter `token_symbol === 'BTC'`
- Khi chọn "BSC": filter `token_symbol !== 'BTC'`

## Kết quả
- Network selector có 3 options: BNB Mainnet / BSC Testnet / Bitcoin
- Chọn Bitcoin → hiển thị logo BTC cam, badge cam, lịch sử chỉ giao dịch BTC
- Trang lịch sử chính có thêm filter theo chain

