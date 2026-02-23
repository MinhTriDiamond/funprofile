
# Phục hồi tất cả giao dịch cũ bị thiếu trong lịch sử

## Nguyên nhân gốc

Cả 2 Edge Function `auto-backfill-donations` và `backfill-donations` đều chỉ tìm người nhận qua trường `wallet_address` trong bảng profiles. Nhưng hệ thống FUN Profile còn dùng `public_wallet_address` (địa chỉ ví công khai) -- nhiều user chỉ có `public_wallet_address` mà không có `wallet_address`, nên các giao dịch gửi đến họ bị bỏ qua (unmappable).

Thêm vào đó, `auto-backfill-donations` chỉ quét **50 giao dịch gần nhất**, nên các giao dịch cũ hơn không bao giờ được xử lý.

## Giải pháp

### 1. Sửa `auto-backfill-donations` (chạy tự động mỗi 5 phút)
- Tăng limit từ 50 lên **1000** để quét được nhiều giao dịch hơn
- Thêm `public_wallet_address` vào bản đồ ví để tìm được người nhận chính xác hơn

### 2. Sửa `backfill-donations` (admin gọi thủ công)
- Tăng limit scan từ 500 lên **1000**
- Thêm `public_wallet_address` vào bản đồ ví cho cả mode `scan` và `backfill`

### 3. Tạo admin action chạy backfill toàn bộ một lần
- Thêm nút trên trang Admin để gọi `auto-backfill-donations` ngay lập tức, phục hồi tất cả giao dịch cũ bị thiếu

## Chi tiết kỹ thuật

### auto-backfill-donations/index.ts
```text
Trước:
  .select("id, wallet_address")
  .limit(50)
  walletMap chỉ dùng wallet_address

Sau:
  .select("id, wallet_address, public_wallet_address")
  .limit(1000)
  walletMap dùng cả wallet_address VÀ public_wallet_address
```

### backfill-donations/index.ts (mode scan + backfill)
```text
Trước:
  .select("id, wallet_address") hoặc .select("id, username, avatar_url, wallet_address")
  walletMap chỉ dùng wallet_address

Sau:
  Thêm public_wallet_address vào select
  walletMap dùng cả wallet_address VÀ public_wallet_address
```

### Files thay đổi
1. `supabase/functions/auto-backfill-donations/index.ts` -- Tăng limit + thêm public_wallet_address
2. `supabase/functions/backfill-donations/index.ts` -- Thêm public_wallet_address cho cả scan và backfill mode
