

## Thêm nút nhạc Valentine vào trang Auth và Law of Light

Hiện tại nút nhạc Valentine chỉ hiển thị trong thanh điều hướng (FacebookNavbar) - vốn không xuất hiện ở 2 trang bên ngoài (Auth và Law of Light). Trang App.tsx có nút nổi toàn cục nhưng chỉ hiển thị trên mobile (`lg:hidden`), nên trên desktop người dùng không thấy nút nhạc ở 2 trang này.

### Thay đổi

1. **src/pages/Auth.tsx** - Thêm nút nhạc Valentine cố định (fixed) ở góc trên phải, cạnh nút chuyển ngôn ngữ, để người dùng desktop và mobile đều thấy và bật nhạc ngay khi vào trang.

2. **src/pages/LawOfLight.tsx** - Tương tự, thêm nút nhạc Valentine cố định ở góc trên phải trang Law of Light.

Nút nhạc sẽ sử dụng variant `desktop` với vị trí cố định, đảm bảo nhạc tự động phát (autoplay) nhờ logic singleton đã có sẵn trong `ValentineMusicButton`.

### Chi tiết kỹ thuật

- Import `ValentineMusicButton` vào cả 2 file
- Đặt nút ở vị trí `fixed top-4 right-16` (bên trái nút ngôn ngữ) với `z-50`
- Không ảnh hưởng đến logic singleton hiện tại - nhạc sẽ tiếp tục phát liền mạch khi chuyển trang

