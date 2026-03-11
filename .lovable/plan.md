

## Kiểm tra tính năng Tặng tiền trên Mobile — Các vấn đề phát hiện & Kế hoạch sửa

Sau khi đọc kỹ code của `UnifiedGiftSendDialog`, `GiftFormStep`, `GiftConfirmStep`, và `MobileBottomNav`, phát hiện **3 vấn đề** trên giao diện điện thoại:

---

### Vấn đề 1: Nút bấm bị che bởi thanh Home trên iPhone

**Nguyên nhân**: DialogContent base có `pb-[calc(1rem+env(safe-area-inset-bottom))]` cho mobile, nhưng `UnifiedGiftSendDialog` ghi đè bằng `p-0 sm:p-0` → mất hoàn toàn safe area padding. Các nút "Hủy" / "Xem lại & Xác nhận" ở cuối form chỉ có `pb-4`, không đủ trên iPhone có thanh home.

**Sửa**: Thêm `pb-safe` (hoặc `pb-[calc(1rem+env(safe-area-inset-bottom))]`) vào phần scroll area bên trong, tại cả `GiftFormStep` và `GiftConfirmStep`.

---

### Vấn đề 2: Form quá dài trên màn hình nhỏ, khó cuộn

Form gồm ~9 section: Người gửi → Người nhận → Mạng → Token (2 hàng) → Số lượng → Số lượng nhanh → Lời nhắn mẫu → Textarea → Cảnh báo → Nút bấm. Trên màn hình 85vh, user phải cuộn rất nhiều.

**Sửa**: 
- Thu gọn section "Người gửi" trên mobile (ẩn wallet address, chỉ hiện tên + avatar nhỏ hơn)
- Giảm `space-y-5` thành `space-y-3` trên mobile trong `GiftFormStep`

---

### Vấn đề 3: Nút X đóng dialog có thể chồng lên tiêu đề dài

Tiêu đề dialog dạng "Trao gửi yêu thương cho @username 🎁❤️🎉" khá dài. Nút X ở `absolute right-4 top-4` có thể bị chồng lên text trên màn hình nhỏ.

**Sửa**: Thêm `pr-10` vào DialogTitle để đảm bảo text không chồng nút X.

---

### Chi tiết kỹ thuật

**File: `src/components/donations/UnifiedGiftSendDialog.tsx`**
- Line 456: Thêm safe area padding cho scroll container
- Line 465: Thêm `pb-safe` vào scroll area div

**File: `src/components/donations/gift-dialog/GiftFormStep.tsx`**
- Line 128: Đổi `space-y-5` → `space-y-3 sm:space-y-5`
- Line 322: Đổi `pb-4` → `pb-[calc(1rem+env(safe-area-inset-bottom))]`
- Thu gọn sender info trên mobile

**File: `src/components/donations/gift-dialog/GiftConfirmStep.tsx`**
- Line 227: Đổi `pb-4` → `pb-[calc(1rem+env(safe-area-inset-bottom))]`

**File: `src/components/donations/UnifiedGiftSendDialog.tsx`**
- DialogTitle: Thêm `pr-10` để tránh chồng nút X

