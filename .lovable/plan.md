

## Mục tiêu
Sửa 4 nhóm lỗi nghiêm trọng trong luồng chuyển tiền & lịch sử giao dịch.

## Phân tích lỗi

### 🔴 Lỗi 1 — Lịch sử "Chuyển ví" không cập nhật
- `useSendToken` ghi vào bảng `transactions` (75 records, tất cả `confirmed`).
- Nhưng `HistoryTab` đọc từ `wallet_transfers` (178 records — do scanner đẩy về) + `donations`.
- Khi gửi quà tặng qua `UnifiedGiftSendDialog`, hệ thống ghi `donations` (nếu có recipient_id) HOẶC `transactions` (chỉ ghi local DB, không reflect vào History).
- Khi user **chuyển tiền tự do** (không qua dialog quà) — không có chỗ trong UI hiện tại — nhưng nếu gọi `sendToken` trực tiếp thì record chỉ vào `transactions`, không vào `wallet_transfers` → mất tích trên History.
- `invalidateDonationCache` invalidate `transaction-history` nhưng `HistoryTab` dùng `donation-history` → không trigger refetch tức thì sau khi gửi.

### 🔴 Lỗi 2 — Số BTC hiển thị sai
- `useBtcTransactions`: `amount = Math.abs(outputSum - inputSum)/1e8`. Khi gửi BTC, ví consume toàn bộ UTXO → `inputSum` lớn, `outputSum` chỉ là **change quay về** → `amount` = (input − change) thay vì (số gửi cho đối tác). Đúng ra cần lấy tổng `vout` đến địa chỉ **khác** sender.
- `SummaryTable` BTC on-chain: cột "Received count" và "Sent count" cùng dùng `btcOnChain.txCount` (1 số) → đếm sai.
- `useBtcBalance.totalReceived/totalSent` dùng `funded_txo_sum/spent_txo_sum` (đếm UTXO sum chứ không phải tổng đã chuyển net) → ví có nhiều consolidation tx hiển thị số inflate.

### 🔴 Lỗi 3 — Mobile: không thấy nút Xác nhận, MetaMask đứng im
- Sau khi tap "Xác nhận", `setBtcTxStep('signing')` hoặc wagmi mở MetaMask. Khi quay lại app, có 2 vấn đề:
  - **Nút bị che**: `DialogContent max-h-[85vh]` + inner `overflow-y-auto` — khi `BtcWalletPanel` render thêm QR + status, action bar trượt khỏi viewport mà user không nhận ra phải scroll.
  - **Kẹt ở "signing"**: trên injected mobile, `sendTransactionAsync` đôi khi không resolve event → `txStep` stuck `signing`, `isSendDisabled=true`, không có nút huỷ rõ ràng. Safety reset 10s chỉ reset wagmi, không reset `txStep`.
- Cần: (a) hiển thị action bar dạng sticky bottom luôn nhìn thấy; (b) thêm nút "Huỷ giao dịch" hiện sau 8s ở trạng thái `signing`.

### 🟡 Lỗi 4 — Cache invalidation chưa đủ
- Sau khi gửi xong, `invalidateDonationCache` không invalidate `wallet_transfers` query, không trigger `usePublicDonationHistory.fetchDonations(1)` → user phải reload mới thấy giao dịch.

## Kế hoạch sửa

### Step 1 — Fix `useBtcTransactions.ts` (số tiền BTC chính xác)
- Khi `net < 0` (sent): `amount = sum(vout where address ≠ sender)` thay vì `|net|`.
- Khi `net > 0` (received): giữ `net/1e8`.

### Step 2 — Fix `SummaryTable` BTC on-chain count
- Truyền 2 số riêng `receivedCount` và `sentCount` thay vì 1 `txCount`. Tính từ `btcTxs` đã parse: đếm `tx.type === 'received'` và `tx.type === 'sent'`.

### Step 3 — Fix `useBtcBalance` total received/sent
- Tách `totalReceived` thành `Σ vout đến address` (dùng net, không cộng change) và `totalSent` tương tự — hoặc derive từ `useBtcTransactions` thay vì `chain_stats`.

### Step 4 — Mobile UX cho `GiftConfirmStep` + `UnifiedGiftSendDialog`
- Wrap action bar (`<div className="flex gap-3 pt-2 ...">`) thành **sticky bottom bar** trong `DialogContent`: `position: sticky; bottom: 0; bg-background; border-t; z-10` với `safe-area-inset-bottom`.
- Trong `useSendToken`: khi `txStep === 'signing'` quá **8 giây**, hiện thêm nút "Huỷ giao dịch" gọi `resetState()` đầy đủ (cả `setTxStep('idle')`, không chỉ wagmiReset).
- Trong `BtcWalletPanel` mobile: nút "Huỷ" luôn hiển thị (không chỉ ở `timeout`).

### Step 5 — Đồng bộ History sau khi gửi
- `UnifiedGiftSendDialog.invalidateDonationCache` thêm:
  - `queryClient.invalidateQueries({ queryKey: ['public-donation-history'] })`
  - `queryClient.invalidateQueries({ queryKey: ['wallet-transfers'] })`
  - `queryClient.invalidateQueries({ queryKey: ['btc-transactions'] })`
- Phát thêm event `wallet-transactions-updated` để `HistoryTab` lắng nghe và `fetchDonations(1)` ngay.

### Step 6 — Ghi log "transfer" cho mọi giao dịch chuyển tiền không qua donation
- Trong `useSendToken` background, sau khi `INSERT transactions` thành công, gọi edge function `record-wallet-transfer` (hoặc INSERT trực tiếp vào `wallet_transfers` với `direction='out'`, `user_id=session.user.id`, `counterparty_address=recipient`) để History tab thấy ngay — **chỉ khi không phải donation** (caller truyền cờ `isDonation`).

## Files sẽ chỉnh
1. `src/hooks/useBtcTransactions.ts` — fix amount calc cho 'sent'.
2. `src/hooks/useBtcBalance.ts` — derive totals từ tx list, hoặc giữ chain_stats nhưng đổi nhãn thành "tổng UTXO" (không gọi là received/sent).
3. `src/components/wallet/tabs/HistoryTab.tsx` — `SummaryTable` nhận `receivedCount`/`sentCount` riêng.
4. `src/components/donations/gift-dialog/GiftConfirmStep.tsx` — sticky bottom action bar + nút Huỷ giao dịch khi signing > 8s.
5. `src/components/donations/gift-dialog/BtcWalletPanel.tsx` — nút Huỷ hiển thị luôn.
6. `src/hooks/useSendToken.ts` — track `signingStartedAt`, expose `canCancel` flag; ghi `wallet_transfers` cho non-donation.
7. `src/components/donations/UnifiedGiftSendDialog.tsx` — mở rộng `invalidateDonationCache` + dispatch event.
8. `src/components/wallet/tabs/HistoryTab.tsx` — listen `wallet-transactions-updated` event để refetch.

## Kiểm thử
- Gửi CAMLY trên desktop → History cập nhật ngay không cần reload.
- Gửi CAMLY trên mobile (injected MetaMask) → nút "Huỷ" xuất hiện sau 8s nếu kẹt; action bar luôn nhìn thấy.
- Gửi BTC native → số BTC hiển thị đúng (= số gửi cho đối tác, không cộng change).
- BTC SummaryTable: cột received count ≠ sent count.

