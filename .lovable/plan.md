
Mình đã rà soát kỹ và chốt được nguyên nhân thật sự:

## Kết luận sau khi kiểm tra

1. Giao dịch mới từ ví ngoài `bc1p5vs6ags4apucay33faz4920u8y0g575l84p8m7f0eac8xqyh955q6hhe6w` sang ví nhận `bc1qej50xw7ax2unfp6lpjc0k65nj38fy7ymx0gfc7` có tồn tại thật trên Bitcoin:
- TX mới nhất thấy được trên chain là `1aea0e75e1382d0cdff85b7041f257a5a5bf0f180bb6262edbf16b3037e432c3`
- Output vào ví nhận là `30000 sats = 0.0003 BTC`

2. Nhưng trong database hiện **không có bản ghi tương ứng** trong:
- `donations`
- `wallet_transfers`

3. Nguyên nhân gốc không còn là UI nữa, mà là **edge function `scan-btc-transactions` đang lỗi compile và không chạy được**:
- Log hiện tại báo:
```text
SyntaxError: Identifier 'recipientProfile' has already been declared
```
- Vì function không boot được, nên mọi luồng:
  - nút quét tay,
  - quét từ `scan-my-incoming`,
  - quét nền từ `auto-scan-donations`
  
  đều không thể ghi nhận BTC từ ví ngoài.

## Những gì cần sửa

### 1. Sửa lỗi compile trong `scan-btc-transactions`
**File:** `supabase/functions/scan-btc-transactions/index.ts`

- Hiện tại trong cùng block đang khai báo `recipientProfile` hai lần.
- Cần đổi tên biến và gom logic rõ ràng:
  - `matchedRecipientProfile`
  - `matchedSenderProfile`
- Sau đó kiểm tra lại toàn bộ nhánh:
  - external wallet → user
  - user → user
  - multi-recipient trong cùng một tx

Mục tiêu:
- Function boot được lại
- Quét được giao dịch BTC từ ví ngoài
- Ghi được `donations` + `wallet_transfers`

### 2. Giữ và rà lại dedup theo `tx_hash + recipient_id`
**File:** `supabase/functions/scan-btc-transactions/index.ts`

- Giữ nguyên hướng sửa trước đó nhưng làm sạch thêm:
  - dedup donations theo `tx_hash + recipient_id`
  - dedup wallet transfers theo `tx_hash + user_id + direction`
  - dedup posts/notifications không chỉ theo `tx_hash` khi cần hiển thị nhiều người nhận

Mục tiêu:
- Một tx gửi cho nhiều ví nhận vẫn hiện đủ
- Không mất recipient thứ 2, thứ 3

### 3. Sửa phần lưu `wallet_transfers` cho BTC external ổn định hơn
**File:** `supabase/functions/scan-btc-transactions/index.ts`

- Hiện đang lọc `existingWt` quá đơn giản theo `tx_hash`.
- Nên kiểm tra theo:
  - `tx_hash`
  - `user_id`
  - `direction`
- Như vậy cùng một tx có thể lưu hợp lệ cho các user khác nhau.

## 4. Bổ sung hiển thị “tất cả giao dịch hôm nay”
### A. Trong `HistoryTab`
**File:** `src/components/wallet/tabs/HistoryTab.tsx`

- Thêm nút preset nhanh:
  - `Hôm nay`
  - `7 ngày`
  - `Tất cả`
- Khi chọn `Hôm nay`, dùng helper giờ Việt Nam để set range đúng theo UTC+7.
- Với BTC, vẫn merge:
  - donation records
  - on-chain records
- Nhưng sẽ lọc theo ngày đã chọn trước khi render.

### B. Trong hook lịch sử ví
**File:** `src/hooks/usePublicDonationHistory.ts`

- Đổi filter ngày hiện tại sang dùng `vnDateToUtcRange()` thay vì `T23:59:59` thủ công.
- Đảm bảo cả:
  - summary
  - donations
  - wallet_transfers
  cùng dùng đúng range “hôm nay” theo giờ Việt Nam.

### C. Trong trang lịch sử hệ thống
**File:** `src/components/donations/SystemDonationHistory.tsx`
**File:** `src/hooks/useAdminDonationHistory.ts`

- Thêm preset lọc nhanh `Hôm nay`
- Cho phép search cả:
  - `sender_address`
  - `tx_hash`
  - địa chỉ BTC nhận/gửi
- Hiện tại search chủ yếu theo username/tx EVM, chưa đủ tốt cho case ví ngoài BTC.

## 5. Cải thiện phản hồi khi quét lỗi
**File:** `src/components/wallet/tabs/HistoryTab.tsx`
**File:** `src/hooks/useScanIncoming.ts`

- Nếu `scan-btc-transactions` trả lỗi, cần toast rõ:
  - “Quét BTC đang lỗi hệ thống”
  - thay vì chỉ báo “Không có giao dịch mới”
- Điều này giúp user không bị hiểu nhầm là không có lệnh.

## 6. Kiểm tra lại đúng case của con
Sau khi sửa, cần xác nhận các lệnh trong hôm nay hiển thị ở 3 nơi:
- Lịch sử ví cá nhân
- Trang `/donations`
- Summary “Hôm nay”

Đặc biệt kiểm tra lại ví:
```text
Ví gửi ngoài:
bc1p5vs6ags4apucay33faz4920u8y0g575l84p8m7f0eac8xqyh955q6hhe6w

Ví nhận:
bc1qej50xw7ax2unfp6lpjc0k65nj38fy7ymx0gfc7
```

Và giao dịch:
```text
TX: 1aea0e75e1382d0cdff85b7041f257a5a5bf0f180bb6262edbf16b3037e432c3
Amount: 0.0003 BTC
```

## Chi tiết kỹ thuật
```text
Root cause chính:
scan-btc-transactions hiện không chạy được do SyntaxError compile-time.

Hệ quả:
- scan tay không ghi dữ liệu
- auto scan không ghi dữ liệu
- scan-my-incoming piggyback cũng không ghi dữ liệu

Các file cần sửa:
- supabase/functions/scan-btc-transactions/index.ts
- src/components/wallet/tabs/HistoryTab.tsx
- src/hooks/usePublicDonationHistory.ts
- src/hooks/useScanIncoming.ts
- src/components/donations/SystemDonationHistory.tsx
- src/hooks/useAdminDonationHistory.ts
```

## Kết quả mong đợi sau khi triển khai
- Giao dịch BTC từ ví ngoài sẽ được ghi nhận lại bình thường
- Lịch sử sẽ hiện đầy đủ các giao dịch trong ngày hôm nay
- Người dùng thấy rõ giao dịch external, on-chain, và đã lưu hệ thống
- Không còn tình trạng “có giao dịch thật nhưng giao diện báo không có”
