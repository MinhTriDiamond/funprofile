

## Giải pháp thay thế: Quét theo Token Contract (không cần Moralis Streams)

### Vấn đề hiện tại
- `auto-scan-donations` quét theo từng ví (527 ví), mỗi lần 10 ví → mất ~4.4 giờ quét hết 1 vòng
- Moralis Streams Webhook cần `MORALIS_STREAM_SECRET` chưa được cấu hình

### Giải pháp mới: Đảo ngược cách quét
Thay vì quét 527 ví riêng lẻ, **quét theo 4 token contract** (USDT, BTCB, CAMLY, FUN). Mỗi lần quét chỉ cần **8 API calls** (4 token × 2 chain) thay vì 1054 calls, và **bao phủ TẤT CẢ ví** trong mỗi lần quét.

```text
Hiện tại:  527 ví × 2 chain = 1054 API calls / vòng → 4.4 giờ
Mới:       4 token × 2 chain = 8 API calls / vòng  → ~1 phút
```

### Cách hoạt động

```text
Cron mỗi 1 phút → Edge Function "fast-scan-donations"
  ├─ Gọi Moralis: GET /{USDT_contract}/transfers?chain=bsc&limit=100
  ├─ Gọi Moralis: GET /{BTCB_contract}/transfers?chain=bsc&limit=100  
  ├─ Gọi Moralis: GET /{CAMLY_contract}/transfers?chain=bsc&limit=100
  ├─ Gọi Moralis: GET /{FUN_contract}/transfers?chain=bsc+testnet&limit=100
  ├─ Lọc: to_address IN danh sách ví fun.rich
  ├─ Dedup: kiểm tra tx_hash đã tồn tại
  └─ Insert: donation + gift_celebration post + notification + chat message
```

### Ưu điểm
- **Không cần secret mới** — dùng `MORALIS_API_KEY` đã có sẵn
- **Phát hiện trong ~1 phút** thay vì 4.4 giờ
- **8 API calls/phút** = ~11,520 calls/ngày (trong giới hạn Moralis)
- **Bao phủ 100% ví** mỗi lần quét

### Chi tiết kỹ thuật

#### 1. Tạo edge function `fast-scan-donations`
- Sử dụng Moralis endpoint: `GET /{token_address}/transfers` cho mỗi token contract
- Song song hóa 8 API calls (4 token × 2 chain)
- Lọc transfers có `to_address` khớp với ví fun.rich
- Tái sử dụng toàn bộ logic tạo donation/post/notification/chat từ `auto-scan-donations`

#### 2. Cập nhật cron schedule
- Chạy `fast-scan-donations` mỗi 1 phút thay vì `auto-scan-donations` mỗi 5 phút
- Giữ `auto-scan-donations` làm backup chạy mỗi 30 phút

#### 3. Files cần tạo/sửa
- **Tạo mới**: `supabase/functions/fast-scan-donations/index.ts`
- **Giữ nguyên**: `moralis-webhook` (dùng sau khi có secret), `auto-scan-donations` (backup)

