

# Thay logo BTCB: từ logo tròn cam sang logo Binance (hình thoi vàng)

## Phân tích
- **Hình 1**: Logo BTCB kiểu Binance (hình thoi vàng trên nền trắng) — đây là logo user muốn dùng
- **Hình 2**: Logo BTCB hiện tại (hình tròn cam với chữ B) — cần thay thế

Logo BTCB hiện tại là file `src/assets/tokens/btcb-logo.webp`, được import tại 3 file: `useTokenBalances.ts`, `TokenSelector.tsx`, `lib/tokens.ts`.

## Thay đổi

### Bước 1: Thay file logo
Copy file hình 1 (logo Binance hình thoi vàng) vào `src/assets/tokens/btcb-logo.png`, sau đó cập nhật các import từ `.webp` sang `.png`.

### Bước 2: Cập nhật import (3 file)
- `src/hooks/useTokenBalances.ts` dòng 10
- `src/components/donations/TokenSelector.tsx` dòng 9
- `src/lib/tokens.ts` dòng 7

Đổi: `btcb-logo.webp` → `btcb-logo.png`

## Kết quả
Logo BTCB mới (hình thoi Binance) hiển thị ở tất cả các trang: ví, donation, profile.

