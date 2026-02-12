

# Bổ sung Logo Đồng Tiền CamLy Xoay Tròn vào Hiệu Ứng Ăn Mừng

## Tình trạng hiện tại
- Chữ RICH đã nổi lên trên card thành công nhờ `createPortal` (đã fix xong)
- Logo `fun-ecosystem-logo.gif` hiện chỉ hiển thị tĩnh trên đầu card (w-16/w-20)
- File `camly-coin-rainbow.png` đã tồn tại trong `src/assets/tokens/`
- Chưa có hiệu ứng đồng tiền CamLy xoay tròn bay khắp màn hình

## Thay đổi cần thực hiện

### 1. `src/components/donations/DonationCelebration.tsx` -- Thêm đồng tiền CamLy xoay
- Import `camly-coin-rainbow.png` từ `src/assets/tokens/`
- Thay thế icon `Coins` (lucide) bằng hình ảnh đồng tiền CamLy thực tế
- Áp dụng CSS `animate-spin` (xoay 360 độ liên tục) cho mỗi đồng tiền
- Giữ nguyên hiệu ứng rơi (`animate-fall`) và vị trí ngẫu nhiên hiện có
- Tăng kích thước đồng tiền từ w-6 h-6 lên **w-10 h-10** để nổi bật hơn
- Thêm hiệu ứng `drop-shadow` vàng gold để đồng tiền phát sáng

### 2. `tailwind.config.ts` -- Thêm animation `spin-slow` (nếu chưa có)
- Đảm bảo animation `spin-slow` tồn tại (xoay chậm 3s) để đồng tiền xoay mượt mà
- Kiểm tra và bổ sung nếu cần

## Kết quả mong đợi
- 20 đồng tiền CamLy rainbow rơi từ trên xuống, xoay tròn liên tục
- Kết hợp với chữ RICH nhảy múa + confetti + pháo hoa tạo hiệu ứng ăn mừng hoành tráng
- Áp dụng cho cả Người Gửi và Người Nhận (cùng dùng DonationCelebration)

## Chi tiết kỹ thuật
- Sửa 1-2 file: `DonationCelebration.tsx` và có thể `tailwind.config.ts`
- Sử dụng asset có sẵn: `src/assets/tokens/camly-coin-rainbow.png`
- Không ảnh hưởng đến các component khác
