

# Fix Swap: Token dropdown không mở được + Báo giá lỗi

## Vấn đề phát hiện

### 1. Token dropdown bị hỏng
`TokenSelector` được định nghĩa **bên trong** component `SwapTab` (dòng 159-191). Đây là anti-pattern trong React — mỗi lần re-render tạo ra component definition mới, khiến dropdown bị unmount/remount liên tục và không bao giờ mở được.

### 2. Báo giá lỗi cho cặp BNB↔USDT↔BTCB  
Hiện tại không có secret `ZEROX_API_KEY` (0x API key) trong project. Mà cặp BNB/USDT/BTCB đang route qua 0x API → luôn bị lỗi 401/403. Chỉ có cặp CAMLY route qua PancakeSwap nên không bị.

## Giải pháp

### File 1: `src/components/wallet/SwapTab.tsx` (VIẾT LẠI)
- **Move `TokenSelector` ra ngoài** thành component riêng nhận props, không tạo lại mỗi render
- **Dùng PancakeSwap cho TẤT CẢ các cặp**, bỏ phụ thuộc 0x API. PancakeSwap V2 hỗ trợ mọi cặp BNB/USDT/BTCB/CAMLY trên BSC — đều có liquidity pool
- Thêm nút Refresh quote thủ công
- Cải thiện UX: hiển thị tỷ giá, animation mượt hơn

### File 2: `src/modules/wallet/services/swapAsset.ts` (SỬA)
- **Dùng PancakeSwap cho mọi cặp** (bỏ 0x routing): tất cả token đều có pool trên PancakeSwap V2 qua WBNB
- Loại bỏ `getZeroXQuote` và `executeZeroXSwap`
- Đơn giản hóa `getSwapQuote` — luôn gọi PancakeSwap Router `getAmountsOut`
- Đơn giản hóa `executeSwap` — luôn gọi PancakeSwap Router

### Không cần sửa
- `src/config/swap.ts` — đã đủ PancakeSwap ABI
- `supabase/functions/swap-quote/` — giữ lại nhưng không dùng nữa (có thể dùng sau khi có API key)
- `WalletCenterContainer.tsx` — Dialog swap đã OK

## Tổng: 2 file sửa
- `src/components/wallet/SwapTab.tsx` — Fix TokenSelector + UI improvements
- `src/modules/wallet/services/swapAsset.ts` — Chuyển toàn bộ sang PancakeSwap routing

