

# Sửa lỗi gửi BTC + Bổ sung lịch sử giao dịch BTC

## Vấn đề chính
1. **Lỗi "Ví đang ở chain khác"**: Khi chọn mạng BTC trong dialog "Trao gửi yêu thương", `isWrongNetwork = chainId !== selectedChainId` luôn `true` vì EVM chainId không bao giờ = 0 (BTC_MAINNET). Dialog bị khóa nút gửi và hiện cảnh báo sai.
2. **Thiếu lịch sử giao dịch BTC**: Tab Lịch sử chưa hiển thị giao dịch BTC từ blockchain.

## Thay đổi

### 1) `src/components/donations/UnifiedGiftSendDialog.tsx` — Xử lý BTC đặc biệt

- Khi `selectedChainId === BTC_MAINNET`:
  - `isWrongNetwork = false` (BTC không cần switch EVM chain)
  - `formattedBalance` lấy từ `useBtcBalance` thay vì EVM balance
  - Khi nhấn gửi → mở BIP21 deep link (`bitcoin:{address}?amount={amount}`) thay vì gọi wagmi `sendTransaction`
  - Import `useBtcBalance` và `BTC_MAINNET`

### 2) `src/components/donations/gift-dialog/GiftFormStep.tsx` — Ẩn warning khi BTC

- Truyền thêm prop `selectedChainId`
- Khi `selectedChainId === BTC_MAINNET`: ẩn block "Ví đang ở chain khác" và ẩn gas warning (BTC không dùng gas EVM)
- Thay nút "Gửi" thành "Mở ví BTC để gửi" khi chọn BTC

### 3) `src/hooks/useBtcTransactions.ts` — Hook mới lấy lịch sử BTC

- Gọi `https://mempool.space/api/address/{address}/txs` để lấy danh sách giao dịch
- Parse mỗi tx: txid, thời gian, tổng value in/out, xác định gửi/nhận dựa trên so sánh address
- Return: `{ transactions, isLoading, refetch }`

### 4) `src/components/wallet/tabs/HistoryTab.tsx` — Hiển thị lịch sử BTC

- Import `useBtcTransactions`
- Khi `selectedNetwork === 'bitcoin'`: hiển thị giao dịch BTC từ hook mới thay vì từ database donation_history
- Mỗi row: icon gửi/nhận, txid rút gọn, số BTC, thời gian, link mempool.space

## Kết quả
- Chọn BTC trong dialog gửi → không còn lỗi "wrong network", hiển thị đúng số dư BTC, gửi qua BIP21
- Tab Lịch sử hiển thị giao dịch BTC thực từ blockchain

