
# Kế Hoạch Sửa Lỗi Vị Trí Video Hoa Mai Hoa Đào

## Vấn Đề Phát Hiện

Video nền Tết bị cắt phần trên (nơi có hoa mai, hoa đào, đèn lồng) vì:
- Sử dụng `top-1/2 -translate-y-1/2` → căn giữa theo chiều dọc
- Khi màn hình nhỏ hơn video, phần TOP bị cắt bỏ
- Chỉ thấy phần giữa và dưới (cánh hoa rơi nhỏ)

---

## Giải Pháp

Thay đổi vị trí căn chỉnh video từ **center** sang **top** để đảm bảo hoa mai/hoa đào ở góc trên luôn hiển thị.

### Thay đổi trong TetBackground.tsx

```text
Trước:
className="absolute top-1/2 left-1/2 min-w-full min-h-full 
           w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover"

Sau:
className="absolute top-0 left-1/2 min-w-full min-h-full 
           w-auto h-auto -translate-x-1/2 object-cover object-top"
```

### Chi Tiết Thay Đổi:
| Thuộc Tính | Trước | Sau | Giải Thích |
|------------|-------|-----|------------|
| `top` | `top-1/2` | `top-0` | Căn từ trên xuống |
| `translate-y` | `-translate-y-1/2` | (xóa) | Không cần dịch chuyển |
| `object-position` | (mặc định: center) | `object-top` | Ưu tiên hiển thị phần trên |

---

## File Cần Chỉnh Sửa

**src/components/ui/TetBackground.tsx**

Thay đổi dòng 20 từ:
```tsx
className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover"
```

Thành:
```tsx
className="absolute top-0 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 object-cover object-top"
```

---

## Kết Quả Mong Đợi

Sau khi sửa:
- Hoa đào (hồng) và đèn lồng đỏ ở góc **trên bên trái** hiển thị rõ
- Hoa mai (vàng) và đèn lồng đỏ ở góc **trên bên phải** hiển thị rõ  
- Cánh hoa rơi động vẫn hiển thị ở giữa và phía dưới
- Giống hệt hình tham chiếu con gửi

---

## Sơ Đồ Minh Họa

```text
╔═══════════════════════════════════════════════════╗
║  🏮 HOA ĐÀO          [Navbar]           HOA MAI 🏮 ║  ← PHẦN NÀY sẽ hiển thị
║  (hồng)                                  (vàng)   ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║     [Sidebar]     [Content]     [Sidebar]         ║
║                                                   ║
║           🌸 cánh hoa rơi động 🌸                  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```
