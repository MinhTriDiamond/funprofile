

# Kế Hoạch Điều Chỉnh Vị Trí Video Nền Tết

## Phân Tích Hiện Tại

Qua screenshot con gửi, tôi thấy:
- Đèn lồng đỏ bên trái đã hiển thị nhưng bị cắt một phần ở trên
- Hoa mai vàng bên phải cũng bị cắt phần trên
- Video đang được căn `top-0` nhưng do `object-cover` và tỷ lệ màn hình, phần trên cùng vẫn bị cắt

## Giải Pháp

Thêm một khoảng cách âm (negative margin/translate) để kéo video lên trên, hoặc dùng `object-position` với giá trị tùy chỉnh để hiển thị phần trên của video nhiều hơn.

### Thay đổi trong TetBackground.tsx

```text
Trước:
className="absolute top-0 left-1/2 ... object-cover object-top"

Sau:
style={{ objectPosition: 'center top -50px' }}
// Hoặc dùng transform để kéo video lên
className="absolute -top-12 left-1/2 ... object-cover"
```

### Phương án được đề xuất

Sử dụng `top` với giá trị âm để kéo video lên trên, giúp phần đèn lồng và hoa ở góc trên hiển thị đầy đủ hơn:

```tsx
// Thay đổi từ top-0 sang -top-12 (hoặc -top-16)
className="absolute -top-12 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 object-cover"
```

**Giải thích:**
- `-top-12` = -48px: Kéo video lên trên 48px
- Bỏ `object-top` vì không cần thiết khi đã dịch chuyển video
- Giữ `object-cover` để video vẫn phủ toàn bộ màn hình

---

## File Cần Chỉnh Sửa

**src/components/ui/TetBackground.tsx**

Dòng 20, thay đổi từ:
```tsx
className="absolute top-0 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 object-cover object-top"
```

Thành:
```tsx
className="absolute -top-12 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 object-cover"
```

---

## Kết Quả Mong Đợi

Sau khi điều chỉnh:
- Đèn lồng đỏ bên trái hiển thị đầy đủ hơn (không bị cắt phần trên)
- Hoa mai vàng bên phải hiển thị đầy đủ hơn
- Hoa đào hồng và các chi tiết trang trí ở góc trên sẽ rõ ràng hơn
- Cánh hoa bay vẫn hiển thị ở phần giữa và dưới

---

## Sơ Đồ Minh Họa

```text
╔═══════════════════════════════════════════════════════════════╗
║ 🏮 ĐÈN LỒNG       [Navbar]                  HOA MAI 🏮       ║
║ (đầy đủ)                                    (đầy đủ)         ║
║ HOA ĐÀO                                     HOA VÀNG         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  [Sidebar]        [Content]              [Sidebar]            ║
║                                                               ║
║               🌸 cánh hoa bay động 🌸                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

