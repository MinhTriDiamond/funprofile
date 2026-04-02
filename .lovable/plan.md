

# Khắc phục flow gửi BTC: Thêm bước xác nhận giống EVM

## Vấn đề hiện tại

1. **Hình 1**: Khi bấm "Mở ví BTC để gửi", `window.location.href` chuyển hướng sang protocol `bitcoin:` → trên desktop không có ví xử lý → hiện toast fallback "Không tìm thấy ví BTC" nhưng không có bước xác nhận nào
2. **Yêu cầu**: Flow BTC cần giống flow EVM — bấm nút → hiện bước xác nhận (Confirm Step) với đầy đủ thông tin người gửi/nhận → bấm "Xác nhận & Tặng" → mở BIP21 deep link → hiện trạng thái thành công

## Giải pháp

### 1) `GiftFormStep.tsx` — Bỏ `onBtcSendDirect`, dùng lại flow confirm bình thường

Khi `selectedChainId === BTC_MAINNET`, nút bấm gọi `onGoToConfirm` thay vì `onBtcSendDirect` — chuyển sang bước xác nhận giống EVM. Text nút vẫn giữ "Xác nhận & Tặng" thống nhất.

### 2) `GiftConfirmStep.tsx` — Xử lý hiển thị cho BTC

- Khi `isBtcConfirm`, nút "Xác nhận & Tặng" vẫn gọi `onSend` như EVM
- Hiển thị đúng địa chỉ BTC cho cả người gửi (từ `senderProfile.btc_address`) và người nhận (từ `recipient.btcAddress`)
- Chain hiển thị "Bitcoin Mainnet"

### 3) `UnifiedGiftSendDialog.tsx` — Sửa `handleSend` cho BTC

Thay vì mở BIP21 rồi return ngay, flow BTC sẽ:
1. Set `txStep = 'signing'` → hiện progress "Vui lòng xác nhận trong ví..."
2. Mở BIP21 deep link bằng `window.location.href` (fallback: copy địa chỉ nếu không có ví)
3. Set `txStep = 'broadcasted'` sau 2 giây
4. Ghi donation vào DB (gọi `recordDonationBackground` với txHash giả `btc-manual-{timestamp}`)
5. Set `txStep = 'success'` → hiện "Hoàn tất!"
6. Hiện celebration card (DonationSuccessCard) giống EVM

Bỏ prop `onBtcSendDirect` khỏi `GiftFormStep` vì không còn cần thiết.

### 4) Bỏ logic `onBtcSendDirect` inline (dòng 644-671)

Xóa toàn bộ block `onBtcSendDirect` trong phần render `GiftFormStep`, vì BTC giờ đi qua flow confirm → handleSend.

## Kết quả

- Chọn mạng BTC → nhập số lượng → bấm nút → hiện bước xác nhận với đầy đủ thông tin (giống hình 2)
- Bấm "Xác nhận & Tặng" → mở ví BTC qua BIP21 (giống hình 3) + hiện progress bar
- Sau khi mở ví → hiện trạng thái thành công + celebration card
- Không còn mở tab trắng hay toast "Không tìm thấy ví BTC" bất ngờ

