

# Sửa Nút Angel AI Bị Che Khuất Nút Gửi Tin Nhắn

## Vấn đề

Nút Angel AI nổi (floating button) có vị trí mặc định quá thấp, nằm đè lên khu vực nhập tin nhắn và nút gửi khi người dùng ở trang Chat trên mobile.

Tính năng kéo thả đã có sẵn nhưng người dùng có thể không biết, và vị trí mặc định cần được điều chỉnh.

## Giải pháp

### 1. Điều chỉnh vị trí mặc định cao hơn

File: `src/components/angel-ai/AngelFloatingButton.tsx`

- Thay đổi vị trí Y mặc định từ `window.innerHeight - BUTTON_SIZE - 96` lên `window.innerHeight - BUTTON_SIZE - 180` (cao hơn ~84px) để tránh vùng bottom nav + chat input.

### 2. Tự động dịch lên khi ở trang Chat

File: `src/components/angel-ai/AngelFloatingButton.tsx`

- Thêm logic detect khi đang ở route `/chat/*` bằng `useLocation()`
- Khi ở trang chat, nếu nút đang ở vị trí quá thấp (gần vùng input), tự động dịch lên cao hơn để tránh che khuất
- Giới hạn Y tối đa khi ở trang chat: `window.innerHeight - BUTTON_SIZE - 180` (trên cả bottom nav + input)

### 3. Thêm hiệu ứng gợi ý kéo thả

- Khi nút được render lần đầu (chưa có vị trí lưu trong localStorage), thêm animation nhẹ "bounce" hoặc "wiggle" ngắn để người dùng biết có thể kéo nút di chuyển

## Chi tiết kỹ thuật

- Sử dụng `useLocation()` từ react-router-dom để detect route `/chat`
- Khi route thay đổi sang `/chat/*`, kiểm tra position.y, nếu > threshold thì setPosition lên cao hơn
- Vẫn giữ nguyên toàn bộ logic drag/snap hiện tại
- Chỉ sửa 1 file: `src/components/angel-ai/AngelFloatingButton.tsx`

