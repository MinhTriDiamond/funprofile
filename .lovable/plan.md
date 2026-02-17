

# Chỉnh giao diện thông báo nhận tiền: Nền pháo hoa + RICH chạy 1 lần

## Vấn đề hiện tại
1. **Nền vẫn xanh**: Video `tet6-2.mp4` được import nhưng có thể không hiển thị đúng, cần thay bằng video mới `tet6-3.mp4` mà con vừa gửi.
2. **Chữ RICH bay liên tục**: Animation `rich-float` đang đặt `infinite` nên chữ RICH bay hoài không dừng.
3. **Nhạc RICH hát liên tục**: Đang dùng `playCelebrationMusicLoop` (loop = true) nên nhạc lặp mãi.

## Thay đổi cần thực hiện

### 1. Thay video nền mới (`tet6-3.mp4`)
- Copy file `tet6-3.mp4` vào `src/assets/tet6-3.mp4`
- Cập nhật import trong `DonationReceivedCard.tsx` sang video mới
- Cập nhật import trong `DonationSuccessCard.tsx` nếu cũng dùng video nền Tết

### 2. Chữ RICH chỉ chạy 1 lần rồi biến mất
- **File `tailwind.config.ts`**: Đổi animation `rich-float` từ `infinite` thành chạy 1 lần (`forwards` để giữ trạng thái kết thúc ẩn đi)
- **File `RichTextOverlay.tsx`**: Thêm state quản lý hiển thị, sau khi animation kết thúc (~3 giây) thì tự ẩn component

### 3. Nhạc RICH chỉ hát 1 lần rồi dừng
- **File `DonationReceivedCard.tsx`**: Đổi từ `playCelebrationMusicLoop` sang `playCelebrationMusic` (hàm này đã có sẵn, chạy 1 lần không lặp)
- **File `DonationSuccessCard.tsx`**: Tương tự đổi sang `playCelebrationMusic`

## Chi tiết kỹ thuật

### File 1: `src/components/donations/RichTextOverlay.tsx`
- Thêm `useState` và `useEffect` để tự ẩn sau 3 giây
- Đổi animation class từ `animate-rich-float` (infinite) sang style riêng chạy 1 lần với `animation-fill-mode: forwards`

### File 2: `tailwind.config.ts`
- Giữ nguyên keyframes `rich-float`
- Đổi dòng animation từ `"rich-float 2s ease-in-out infinite"` thành `"rich-float 2.5s ease-in-out forwards"` (chạy 1 lần, giữ trạng thái cuối)

### File 3: `src/components/donations/DonationReceivedCard.tsx`
- Thay import video: `tet6-2.mp4` thành `tet6-3.mp4`
- Thay `playCelebrationMusicLoop` thành `playCelebrationMusic` (phát 1 lần)

### File 4: `src/components/donations/DonationSuccessCard.tsx`
- Thay `playCelebrationMusicLoop` thành `playCelebrationMusic` (phát 1 lần)

## Tóm tắt
- Sửa **4 file** + copy **1 file video mới**
- Nền video pháo hoa `tet6-3.mp4` hiển thị phía sau nội dung thẻ
- Chữ RICH bay 1 lần (~3 giây) rồi tự biến mất
- Nhạc RICH hát trọn 1 lần rồi dừng, không lặp lại

