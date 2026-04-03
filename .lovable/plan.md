

# Rà soát và hiển thị đầy đủ các giao dịch BTC trước đó

## Phát hiện sau kiểm tra

1. **Database**: Tài khoản `angelkim` hiện chỉ có **1 giao dịch BTC** trong hệ thống (TX `c474edc...`, 0.0001 BTC từ ví ngoài `bc1qmkr...`). Cả `donations` và `wallet_transfers` đều có bản ghi.

2. **Scanner đang bị rate-limit**: Edge function `scan-btc-transactions` đã boot được (không còn SyntaxError), nhưng log cho thấy Mempool API trả **HTTP 429** (rate limit) cho một số địa chỉ. Điều này khiến giao dịch của một số user không được quét hết.

3. **BTC wallet_transfers bị ẩn trong giao diện Bitcoin**: Code `HistoryTab.tsx` dòng 468-469 lọc `d.type !== 'transfer'` khi xây dựng `unifiedBtcEntries`. Nếu một giao dịch BTC chỉ có `wallet_transfer` mà không có `donation` (ví dụ: gửi BTC ra ngoài), nó sẽ **không hiển thị** trên tab Bitcoin.

## Thay đổi cần thực hiện

### 1. Sửa rate-limit trong scanner
**File:** `supabase/functions/scan-btc-transactions/index.ts`

- Tăng delay giữa mỗi user từ 200ms lên 500ms
- Thêm retry logic khi gặp HTTP 429 (chờ 2 giây rồi thử lại 1 lần)
- Giảm batch size từ 10 xuống 5

### 2. Hiển thị BTC wallet_transfers trong tab Bitcoin
**File:** `src/components/wallet/tabs/HistoryTab.tsx`

- Trong `unifiedBtcEntries`, bổ sung BTC wallet_transfers (type='transfer', token_symbol='BTC') vào danh sách unified
- Dedup theo `tx_hash` để tránh trùng với donation record
- Hiển thị dưới dạng `TransferCard` có badge "Ví ngoài" hoặc "On-chain" tùy thuộc

### 3. Deploy và trigger quét lại
- Deploy edge function đã sửa
- Trigger scan lại cho user angelkim để bắt các giao dịch bị miss do rate-limit trước đó

## Chi tiết kỹ thuật

```text
Nguyên nhân giao dịch trước đó không hiển thị:
1. Scanner bị rate-limit (429) → không fetch được tx history
2. wallet_transfers BTC bị lọc bỏ khỏi unified view

File cần sửa:
- supabase/functions/scan-btc-transactions/index.ts (retry + delay)
- src/components/wallet/tabs/HistoryTab.tsx (include BTC transfers in unified view)
```

