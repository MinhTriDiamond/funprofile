

# Fix Swap Modal bị cắt trên mobile DApp browser

## Vấn đề
Screenshot cho thấy nút "Swap" bị cắt ở dưới khi mở trong DApp browser (MetaMask/Trust Wallet). Nguyên nhân:

1. **`dialog.tsx` dòng 41**: Mobile style có `max-h-[85vh]` nhưng **thiếu `overflow-y-auto`** — chỉ desktop (dòng 43) mới có `sm:overflow-y-auto`. Nội dung dài hơn 85vh sẽ bị ẩn.
2. **SwapTab**: Nút Swap/Approve nằm cuối content, dễ bị ẩn khi có quote details. Cần sticky footer.

## Sửa 2 file

### File 1: `src/components/ui/dialog.tsx` (dòng 41)
- Thêm `overflow-y-auto` vào mobile style (trước `sm:` breakpoint)
- Đổi `max-h-[85vh]` thành `max-h-[calc(85vh-env(safe-area-inset-bottom))]` để tính safe area trên mobile

### File 2: `src/components/wallet/SwapTab.tsx`
- Chia layout thành 2 phần: scrollable content + sticky footer (nút Swap/Approve)
- Wrap phần chính trong `div` có `flex-1 overflow-y-auto` 
- Nút action có `sticky bottom-0 bg-background pt-2 pb-safe`
- Giảm spacing trên mobile (`space-y-3` thay vì `space-y-4`) để tiết kiệm không gian dọc

Không tạo file mới. 2 file sửa nhỏ.

