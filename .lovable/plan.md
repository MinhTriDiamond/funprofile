

## Khắc phục thanh cuộn cho tất cả dialog chuyển tiền

### Nguyên nhân

Trong `src/components/ui/dialog.tsx` (line 43), class `sm:max-h-none` xóa giới hạn chiều cao trên desktop. Mặc dù `UnifiedGiftSendDialog` đã ghi đè bằng `sm:!max-h-[85vh]`, nhưng vấn đề là **`overflow-hidden`** trên `DialogContent` kết hợp với `!flex !flex-col` có thể xung đột với `grid` layout mặc định.

Thực tế, từ screenshot thấy đây là trên **desktop** và nội dung bị cắt ở phần "Lời nhắn" — không cuộn được.

### Giải pháp

**File 1: `src/components/ui/dialog.tsx`** — Sửa tại gốc, thay `sm:max-h-none` bằng `sm:max-h-[85vh]` và thêm `overflow-y-auto` cho desktop. Điều này đảm bảo **tất cả** dialog dùng component này đều có thanh cuộn khi nội dung dài.

```
// Line 43, thay:
sm:max-h-none
// Bằng:
sm:max-h-[85vh] sm:overflow-y-auto
```

**File 2: `src/components/donations/UnifiedGiftSendDialog.tsx`** — Đơn giản hóa className vì dialog gốc đã xử lý max-height. Giữ `!flex !flex-col` và `overflow-hidden` trên outer, để inner div xử lý scroll. Loại bỏ `sm:!max-h-[85vh]` vì đã được xử lý ở gốc.

### Tác động
- Tất cả dialog trong app (cài đặt ví, gửi crypto, tặng quà...) đều tự động có thanh cuộn khi nội dung vượt quá 85vh.
- Không cần ghi đè từng dialog riêng lẻ nữa.

