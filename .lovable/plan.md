

## Tính năng: Phát hiện và ghi nhận giao dịch nhận từ ví bên ngoài

### Mục tiêu
Khi user mở trang Ví, hệ thống tự động quét blockchain (BSC) để tìm các giao dịch token gửi đến địa chỉ ví của họ mà chưa được ghi nhận trong hệ thống. Nếu phát hiện, tự động tạo record donation và hiển thị card chúc mừng.

### Kiến trúc

```text
User mở Wallet
      |
      v
[Frontend hook: useIncomingTransferDetector]
      |
      v
[Edge Function: detect-incoming-transfers]
      |
      +--> Gọi BscScan API lấy token transfers đến ví user
      +--> So sánh với donations đã ghi nhận (theo tx_hash)
      +--> Tìm sender address -> map với profiles (nếu có)
      +--> INSERT donation records cho giao dịch mới
      +--> Return danh sách giao dịch mới phát hiện
      |
      v
[Frontend nhận kết quả]
      |
      +--> Hiển thị toast thông báo
      +--> Realtime trigger -> DonationReceivedCard hiển thị card chúc mừng
      +--> Invalidate donation-history cache
```

### Các bước thực hiện

**Bước 1: Tạo Edge Function `detect-incoming-transfers`**

- Nhận `user_id` từ auth token
- Lấy `public_wallet_address` của user từ bảng profiles
- Gọi BscScan API để lấy danh sách token transfers (BEP-20) đến ví đó trong 7 ngày gần nhất
- Hỗ trợ các token: BNB (native), CAMLY, USDT, BTCB
- So sánh `tx_hash` với bảng `donations` để tìm giao dịch chưa ghi nhận
- Với mỗi giao dịch mới:
  - Tìm sender address trong profiles (nếu khớp -> gắn sender_id)
  - Nếu sender không có trong hệ thống -> ghi nhận sender_id = NULL hoặc tạo placeholder
  - INSERT vào bảng `donations` với status = 'confirmed'
  - INSERT notification cho người nhận
- Return số giao dịch mới phát hiện

**Bước 2: Cập nhật bảng `donations`**

- Cho phép `sender_id` nullable (ALTER COLUMN) vì sender có thể là ví ngoài không có profile
- Thêm cột `sender_address` (text, nullable) để lưu địa chỉ ví gốc khi sender không có profile
- Thêm cột `is_external` (boolean, default false) để đánh dấu giao dịch từ ví ngoài

**Bước 3: Tạo hook `useIncomingTransferDetector`**

- Gọi edge function khi user mở trang Wallet (chỉ gọi 1 lần mỗi session, debounce 5 phút)
- Lưu timestamp lần quét cuối vào localStorage để tránh gọi quá nhiều
- Nếu phát hiện giao dịch mới -> hiển thị toast "Phát hiện X giao dịch mới!"
- Invalidate donation-history query cache

**Bước 4: Cập nhật UI hiển thị**

- `DonationHistoryTab`: Hiển thị giao dịch external với nhãn "Ví ngoài" thay vì tên user khi sender không có profile
- `DonationReceivedCard`: Hiển thị card chúc mừng bình thường (Realtime trigger từ INSERT)
- Hiển thị địa chỉ ví rút gọn của sender thay vì username khi là external

### Chi tiết kỹ thuật

**BscScan API:**
- Endpoint: `https://api.bscscan.com/api`
- Module: `account`, action: `tokentx` (BEP-20) + `txlist` (BNB native)
- Cần API key (free tier: 5 calls/sec)
- Filter theo `to` address = ví user

**Secret cần thêm:** `BSCSCAN_API_KEY`

**Cột mới trong bảng donations:**
- `sender_address TEXT` -- địa chỉ ví khi sender không có profile
- `is_external BOOLEAN DEFAULT false` -- giao dịch từ ví ngoài

**Schema change cho `sender_id`:**
- ALTER `sender_id` thành nullable (hiện tại có thể đang NOT NULL do FK constraint)

**Tần suất quét:**
- Tự động khi mở trang Wallet, tối đa 1 lần / 5 phút
- Nút "Quét giao dịch mới" thủ công trong DonationHistoryTab

