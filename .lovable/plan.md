
# Kế Hoạch: Tăng Khoảng Cách Trang Trí Dưới Navbar

## Phân Tích Hiện Trạng

| Thành phần | Giá trị hiện tại |
|------------|------------------|
| Navbar height | 48-56px (h-12 md:h-14) |
| Content top offset | 3cm ≈ 113px từ top viewport |
| Khoảng trống trang trí | ~57px (113 - 56) |

## Vấn Đề
Khoảng trống 57px không đủ để hiển thị rõ lồng đèn và hoa mai/đào như trong hình tham khảo.

## Giải Pháp
Tăng `top` offset lên **4cm** (≈ 151px) để tạo khoảng trống trang trí ~95px phía dưới navbar.

### File: `src/index.css`

**Trước:**
```css
.app-shell-content {
  top: calc(3cm + env(safe-area-inset-top, 0px));
}
```

**Sau:**
```css
.app-shell-content {
  top: calc(4cm + env(safe-area-inset-top, 0px));
}
```

## Kết Quả Mong Đợi

| Thiết Bị | Khoảng trống trang trí |
|----------|------------------------|
| Desktop (navbar 56px) | ~95px ✅ |
| Mobile (navbar 48px) | ~103px ✅ |

Điều này đảm bảo:
1. Lồng đèn phía trên hiển thị rõ ràng dưới navbar
2. Hoa mai/đào 2 bên có đủ không gian để thấy được
3. Đồng nhất trên cả máy tính và điện thoại
