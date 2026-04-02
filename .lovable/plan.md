

# Cải thiện flow gửi BTC: Mở ví đúng cách + Chờ xác nhận on-chain

## Vấn đề hiện tại

1. **Hình 1**: Khi bấm "Xác nhận & Tặng" trên desktop, `window.location.href = bitcoin:...` không mở được ví → hiện toast lỗi "Không tìm thấy ví BTC" sau 2 giây — trải nghiệm kém
2. **Celebration card hiện ngay** dù chưa có giao dịch thật trên blockchain (dùng txHash giả `btc-manual-{timestamp}`)

## Giải pháp

### 1) Sửa cách mở ví BTC — phân biệt mobile vs desktop

**File:** `src/components/donations/UnifiedGiftSendDialog.tsx` (hàm `handleSend`, dòng 377-433)

Thay vì chỉ dùng `window.location.href = bip21Url` cho mọi trường hợp:

- **Mobile (trong dApp browser — MetaMask/Trust/Bitget)**: giữ nguyên `window.location.href = bip21Url` vì ví native xử lý protocol `bitcoin:` trực tiếp
- **Desktop / Mobile ngoài dApp browser**: Hiển thị một **panel hướng dẫn** ngay trong dialog (thay vì mở tab mới hoặc báo lỗi):
  - Hiện QR code chứa BIP21 URI (dùng `qrcode.react` đã có trong dependencies)
  - Hiện nút "Sao chép địa chỉ" + "Sao chép số lượng" 
  - Hiện nút "Thử mở ví" (gọi `window.location.href = bip21Url` để thử — nếu wallet extension có hỗ trợ thì sẽ mở)
  - Bỏ toast lỗi "Không tìm thấy ví BTC" — thay bằng hướng dẫn trực quan trong dialog

### 2) Chờ xác nhận on-chain trước khi hiện celebration

**File mới:** `src/hooks/useBtcTransactionPolling.ts`

Tạo hook polling Mempool.space API để detect giao dịch BTC mới:
- Input: `recipientBtcAddress`, `expectedAmount`, `enabled`
- Gọi `https://mempool.space/api/address/{address}/txs` mỗi 15 giây
- So sánh danh sách tx mới với snapshot lúc bắt đầu polling
- Khi phát hiện tx mới có output đến `recipientBtcAddress` với amount gần đúng → trả `txid` thật
- Timeout sau 10 phút → cho phép user bấm "Đánh dấu đã gửi" thủ công

**File:** `src/components/donations/UnifiedGiftSendDialog.tsx`

Sửa flow BTC trong `handleSend`:
1. Set `btcTxStep = 'signing'` + hiện panel mở ví (QR/deep link)
2. Bắt đầu polling Mempool.space cho recipient address
3. Khi polling phát hiện tx → set `btcTxStep = 'broadcasted'` → `'confirming'`
4. Khi tx có ≥1 confirmation → set `btcTxStep = 'success'`, ghi donation với txHash thật, hiện celebration card
5. Nếu timeout 10 phút: hiện nút "Tôi đã gửi" → ghi donation với hash giả + hiện celebration, hoặc "Hủy" → quay lại

### 3) Tạo component hiển thị panel mở ví BTC

**File mới:** `src/components/donations/gift-dialog/BtcWalletPanel.tsx`

Component hiển thị trong `GiftConfirmStep` khi đang ở trạng thái `signing` cho BTC:
- QR code lớn chứa BIP21 URI
- Địa chỉ nhận (có nút copy)
- Số lượng BTC (có nút copy)
- Nút "Thử mở ví" (deep link)
- Text hướng dẫn: "Quét QR code bằng ví BTC hoặc mở ví thủ công"
- Spinner "Đang chờ giao dịch..." khi polling

### 4) Sửa `DonationSuccessCard` cho BTC

**File:** `src/components/donations/DonationSuccessCard.tsx` (dòng 256-259)

Khi `tokenSymbol === 'BTC'`:
- Hiển thị "Bitcoin Network" thay vì "BSC (BNB Smart Chain)"
- TX Hash link dẫn đến `mempool.space/tx/{hash}` thay vì BscScan

### 5) Sửa `GiftConfirmStep` — hiện BtcWalletPanel khi signing

**File:** `src/components/donations/gift-dialog/GiftConfirmStep.tsx`

Thêm prop `btcBip21Url?: string` và `isBtcSigning?: boolean`. Khi `isBtcSigning = true`, render `BtcWalletPanel` thay vì progress bar thông thường.

## Kết quả

- **Mobile dApp browser**: Bấm "Xác nhận & Tặng" → ví bật lên trực tiếp xử lý giao dịch BTC → polling detect tx → celebration card
- **Desktop / Mobile ngoài dApp browser**: Bấm → hiện QR code + hướng dẫn copy → user gửi từ ví ngoài → polling detect tx → celebration card
- **Không còn toast lỗi** "Không tìm thấy ví BTC"
- **Celebration card chỉ hiện** khi giao dịch thật được xác nhận on-chain (hoặc sau timeout 10 phút nếu user xác nhận thủ công)
- TX Hash trên biên nhận là hash thật từ blockchain

