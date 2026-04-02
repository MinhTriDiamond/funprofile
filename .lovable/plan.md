

# Bổ sung hiển thị số dư BTC trong Send/Receive + Hỗ trợ chuyển nhận BTC

## Tổng quan
Khi user chọn mạng BTC, dialog Gửi và Nhận cần hiển thị đúng địa chỉ BTC + số dư BTC. Tuy nhiên, **gửi BTC native không thể thực hiện qua wagmi/EVM** — cần thông báo rõ cho user copy địa chỉ người nhận và gửi thủ công qua ví BTC bên ngoài.

## Thay đổi

### 1) `src/components/wallet/ReceiveTab.tsx` — Hiển thị địa chỉ BTC khi mạng Bitcoin
- Thêm props `btcAddress` và `selectedNetwork`
- Khi `selectedNetwork === 'bitcoin'`: hiển thị QR code + địa chỉ BTC thay vì EVM address
- Header hiện badge "Bitcoin" với logo cam

### 2) `src/components/wallet/WalletCenterContainer.tsx` — Truyền thêm props
- Truyền `btcAddress` và `selectedNetwork` vào `ReceiveTab`
- Khi `selectedNetwork === 'bitcoin'` và nhấn "Gửi": mở dialog BTC send thay vì UnifiedGiftSendDialog

### 3) `src/components/wallet/BtcSendDialog.tsx` — Dialog gửi BTC mới
- Hiển thị số dư BTC hiện tại (từ `useBtcBalance`)
- Input: địa chỉ người nhận BTC, số lượng BTC
- Hiển thị giá USD tương đương
- **Nút "Gửi qua ví BTC"**: tạo deep link `bitcoin:{address}?amount={amount}` để mở ví BTC native (MetaMask, Trust, Bitget đều hỗ trợ BIP21 URI)
- Fallback: hiển thị nút Copy địa chỉ + số lượng nếu deep link không hoạt động
- Lý do: Lovable là client-side app, không thể sign BTC transaction trực tiếp vì wagmi chỉ hỗ trợ EVM

### 4) `src/components/donations/UnifiedGiftSendDialog.tsx` — Hiển thị số dư BTC
- Khi `selectedChainId === BTC_MAINNET` (0): hiển thị số dư BTC từ `useBtcBalance` thay vì đọc balance EVM
- Chọn token BTC → formattedBalance lấy từ hook `useBtcBalance`

## Tóm tắt files

| File | Thay đổi |
|------|----------|
| `ReceiveTab.tsx` | Thêm props `btcAddress`, `selectedNetwork`; hiển thị QR BTC |
| `WalletCenterContainer.tsx` | Truyền props mới cho ReceiveTab; điều hướng BTC send |
| `BtcSendDialog.tsx` *(mới)* | Dialog gửi BTC với BIP21 URI + hiển thị số dư |
| `UnifiedGiftSendDialog.tsx` | Hiển thị số dư BTC khi chọn mạng BTC |

## Lưu ý kỹ thuật
- Bitcoin không dùng EVM → không thể gửi BTC qua wagmi `sendTransaction`
- Sử dụng **BIP21 URI scheme** (`bitcoin:address?amount=X`) để mở ví BTC native trên thiết bị
- Số dư BTC lấy từ Mempool.space API (đã có hook `useBtcBalance`)

