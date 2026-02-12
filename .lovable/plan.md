

# Fix chữ RICH bị ẩn bên trong khung thông báo Card -- Nổi lên trên toàn màn hình

## Nguyên nhân

Component `RichTextOverlay` hiện render bên trong cây DOM của ứng dụng (React root). Tuy nhiên, Dialog của Radix UI sử dụng **Portal** render ở cuối `<body>`, tạo ra stacking context riêng biệt. Dù `RichTextOverlay` có `z-[10001]`, nhưng vì nằm trong stacking context của app root, nó bị Dialog overlay (z-150) che phủ.

## Giải pháp

Sử dụng `ReactDOM.createPortal` trong `RichTextOverlay` để render trực tiếp vào `document.body`, đảm bảo chữ RICH luôn nổi lên trên mọi thứ -- bao gồm cả Dialog portal.

## Thay đổi cần thực hiện

### 1. `src/components/donations/RichTextOverlay.tsx`
- Import `createPortal` từ `react-dom`
- Bọc toàn bộ nội dung trong `createPortal(content, document.body)` để render trực tiếp vào body
- Giữ nguyên tất cả style, animation, z-index hiện tại

Thay đổi duy nhất: thêm portal wrapper. Không thay đổi gì về visual hay animation.

## Kết quả mong đợi
- Chữ RICH 9 sắc cầu vồng sẽ NỔI LÊN TRÊN tất cả -- bao gồm cả Dialog card
- Hiệu ứng giống hệt Video 2 (bên nhận) cho cả bên gửi
- Không ảnh hưởng đến bất kỳ component nào khác

## Chi tiết kỹ thuật
- Chỉ sửa 1 file: `RichTextOverlay.tsx`
- Thêm `createPortal` từ `react-dom` để bypass stacking context của React root
- Tất cả 6 component sử dụng `RichTextOverlay` (DonationSuccessCard, DonationReceivedCard, GiftCelebrationModal, ClaimRewardDialog, ClaimFunDialog) sẽ tự động được fix

