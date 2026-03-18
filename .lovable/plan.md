

## Plan: Hiển thị 180M CAMLY nhận vào cho Treasury

### Phân tích gốc rễ

Profile **fun profile treasury** (`9e702a6f`) có `public_wallet_address = null`. Địa chỉ ví thực tế lưu trong secret `TREASURY_WALLET_ADDRESS` nhưng không gắn vào profile.

Hệ quả:
- `auto-scan-donations` quét ví từ profile → bỏ sót treasury
- `backfill-wallet-transfers` có fallback đọc env nhưng BSCScan/Moralis bị rate limit → `wallet_transfers` vẫn trống
- `get_user_donation_summary` RPC trả về `received: {}` (0 lệnh nhận)

### Giải pháp: 2 bước

**Bước 1: Gắn wallet address vào treasury profile**

Tạo edge function `sync-treasury-profile` đơn giản:
- Đọc `TREASURY_WALLET_ADDRESS` từ env
- UPDATE `profiles SET public_wallet_address = ?` WHERE `id = '9e702a6f-...'`
- Gọi 1 lần duy nhất, sau đó auto-scan sẽ tự quét được

**Bước 2: Chạy backfill với retry tốt hơn**

Sửa `backfill-wallet-transfers` để BSCScan free API hoạt động ổn hơn:
- Thêm delay giữa các request (free API giới hạn 1 req/5s)
- Nếu vẫn bị rate limit, dùng fallback BSC RPC `eth_getLogs` với block range nhỏ hơn
- Gọi backfill cho treasury sau khi wallet đã gắn

### Files cần tạo/sửa

1. **Tạo mới**: `supabase/functions/sync-treasury-profile/index.ts` — đọc env và update profile
2. **Sửa**: `supabase/functions/backfill-wallet-transfers/index.ts` — thêm delay giữa BSCScan requests, retry logic
3. **Deploy + gọi** cả 2 function lần lượt

### Kết quả mong đợi

- Treasury profile có `public_wallet_address` → auto-scan quét được tương lai
- `wallet_transfers` có record 180M CAMLY (direction = 'in') + lệnh chuyển ra
- Summary hiển thị: Nhận 180M CAMLY, Gửi 104M CAMLY
- Lịch sử giao dịch hiển thị đúng badge "Chuyển vào" / "Chuyển ra"

