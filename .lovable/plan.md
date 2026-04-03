

# Thay logo BTCB sang logo Bitcoin tròn cam

## Vấn đề
- **Hình 1**: Logo BTCB hiện tại là biểu tượng Binance vàng (kim cương) + Bitcoin nhỏ góc phải
- **Hình 2**: User muốn dùng logo Bitcoin tròn cam đơn giản thay thế

## Thay đổi

### Bước 1: Copy logo mới
Copy file `user-uploads://image-1775178240.png` (logo Bitcoin tròn cam) vào `src/assets/tokens/btcb-logo.webp` (ghi đè file cũ, đổi đuôi thành `.png`)

Vì file gốc là `.webp` và được import ở nhiều nơi (`tokens.ts`, `TokenSelector.tsx`, `useTokenBalances.ts`), cần đổi tên file mới thành `btcb-logo.png` và cập nhật tất cả các import.

### Bước 2: Cập nhật import trong 3 file
- `src/lib/tokens.ts` dòng 4: `btcb-logo.webp` → `btcb-logo.png`
- `src/components/donations/TokenSelector.tsx` dòng 8: tương tự
- `src/hooks/useTokenBalances.ts` dòng 9: tương tự

## Kết quả
- Logo BTCB ở tất cả các trang (ví, donation, token selector) sẽ hiển thị logo Bitcoin tròn cam thay vì logo Binance vàng

