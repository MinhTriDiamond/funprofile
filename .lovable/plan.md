

## Sửa lỗi giao diện điện thoại & tính năng tặng tiền

### Vấn đề phát hiện

1. **Gift Dialog bị che bởi bottom nav trên mobile**: `DialogContent` có `max-h-[90vh]` nhưng bottom nav cao 72px + safe-area, khiến nội dung bị cắt ở dưới cùng. Trên ảnh screenshot thấy rõ buttons "Quay lại" / "Đang xử lý" bị sát mép dưới.

2. **SendCryptoModal trong Chat chỉ là placeholder**: File `src/modules/chat/components/SendCryptoModal.tsx` hiện chỉ hiện toast "Tính năng đang được phát triển" — chưa kết nối với hệ thống tặng thật (`UnifiedGiftSendDialog`).

3. **Dialog trên mobile thiếu safe-area padding**: Khi mở dialog trên iPhone, không có padding cho notch/home indicator.

### Giải pháp

| File | Thay đổi |
|---|---|
| `src/components/donations/UnifiedGiftSendDialog.tsx` | Thay `max-h-[90vh]` → `max-h-[85vh]` trên mobile, thêm `pb-safe` padding |
| `src/components/ui/dialog.tsx` | Thêm mobile-friendly styles: trên mobile dialog full-width, rounded-top, slide-up từ dưới |
| `src/modules/chat/components/SendCryptoModal.tsx` | Thay placeholder bằng `UnifiedGiftSendDialog` thật |
| `src/modules/chat/components/CryptoGiftButton.tsx` | Truyền đúng props cho UnifiedGiftSendDialog thay vì SendCryptoModal |
| `src/components/donations/gift-dialog/GiftConfirmStep.tsx` | Thêm `pb-4` cho buttons container để tránh bị cắt |
| `src/components/donations/gift-dialog/GiftFormStep.tsx` | Thêm `pb-4` cho buttons container |

### Chi tiết kỹ thuật

**Dialog mobile-first**: Trên mobile (`< 640px`), dialog sẽ:
- Chiếm full width, bo góc trên, trượt lên từ dưới
- `max-h-[85vh]` thay vì `90vh` để tránh bị bottom nav che
- Thêm `pb-[env(safe-area-inset-bottom)]` cho iPhone

**Chat SendCryptoModal → UnifiedGiftSendDialog**: Thay thế hoàn toàn modal placeholder bằng `UnifiedGiftSendDialog` với `mode="wallet"` và `presetRecipient` từ thông tin người nhận trong chat.

