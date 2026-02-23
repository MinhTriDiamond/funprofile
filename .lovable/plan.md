

# Thêm Liên Kết Hồ Sơ Cho Tên Người Dùng Trong Gift Celebration

## Mục tiêu
Cho phép người dùng bấm vào tên người gửi/người nhận trong thẻ Gift Celebration trên Feed để xem hồ sơ cá nhân.

## Hiện trạng
- Avatar đã có thể bấm được (có `onClick` + `cursor-pointer`) nhưng **tên hiển thị** và **@username** bên dưới avatar chỉ là text thuần, không bấm được.
- Tên trong dòng chính ("Tống Văn Làm đã trao gửi... cho Phương Loan") cũng là text thuần.

## Giải pháp

Sửa file `src/components/feed/GiftCelebrationCard.tsx`:

### 1. Tên + @username dưới avatar người gửi (dòng 278-283)
Bọc tên và @username trong thẻ `button` có `onClick` điều hướng đến `/profile/{senderNavigateId}`, thêm `cursor-pointer` và hiệu ứng `hover:underline`.

### 2. Tên + @username dưới avatar người nhận (dòng 301-306)
Tương tự, bọc trong `button` điều hướng đến `/profile/{gift_recipient_id}`.

### 3. Tên trong dòng nội dung chính (dòng 312-322)
Biến tên người gửi và người nhận trong câu "đã trao gửi... cho..." thành `span` có thể bấm được, điều hướng đến trang hồ sơ tương ứng.

## Chi tiết kỹ thuật

- File cần sửa: `src/components/feed/GiftCelebrationCard.tsx`
- Sử dụng `navigate()` đã có sẵn trong component
- Thêm style: `cursor-pointer hover:underline` cho các tên
- Giữ nguyên logic hiện tại, chỉ bọc thêm element tương tác

