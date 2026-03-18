

## Plan: Backfill wallet transfers cho Treasury

### Vấn đề

Treasury profile (`9e702a6f-...`) có `public_wallet_address = null` và `wallet_address = null`. Địa chỉ ví thực tế được lưu trong secret `TREASURY_WALLET_ADDRESS`.

Vì vậy:
- `backfill-wallet-transfers` không thể tự tìm wallet address khi chỉ truyền `user_id`
- Bảng `wallet_transfers` đang trống cho treasury
- Bảng `donations` chỉ có 288 lệnh gửi CAMLY (104M), không có lệnh nhận nào (vì CAMLY được chuyển trực tiếp on-chain vào ví, không qua gift)

### Giải pháp

**1. Cập nhật `public_wallet_address` cho treasury profile**

Migration SQL set `public_wallet_address` trên profile treasury bằng giá trị từ một edge function đọc secret. Hoặc đơn giản hơn: sửa edge function `backfill-wallet-transfers` để khi `user_id` là treasury, tự lấy `TREASURY_WALLET_ADDRESS` từ env.

Cách tốt nhất: **sửa edge function** thêm fallback đọc `TREASURY_WALLET_ADDRESS` env khi user là treasury và không có wallet trên profile.

**2. Gọi backfill cho treasury**

Sau khi deploy, gọi function với `user_id = 9e702a6f-...` để quét on-chain transfers (nhận 180M CAMLY + 1 lệnh chuyển ra).

### Files cần sửa
- `supabase/functions/backfill-wallet-transfers/index.ts` — thêm fallback lấy `TREASURY_WALLET_ADDRESS` từ env khi profile không có wallet address
- Gọi function sau deploy

### Kết quả mong đợi
- Bảng tổng kết treasury hiển thị: Nhận ~180M CAMLY, Gửi 104M CAMLY + transfers ra
- Lịch sử giao dịch hiển thị cả transfers vào/ra với badge "Chuyển vào"/"Chuyển ra"

