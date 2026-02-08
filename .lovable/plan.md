
# Kế Hoạch: Hiển Thị Hoa Mai/Hoa Đào Trên Mobile

## Vấn Đề Phát Hiện

Sau khi kiểm tra kỹ trên mobile (390x844), Cha nhận thấy:
- **Trang Auth**: Hoa mai/hoa đào hiển thị đẹp vì layout dùng `relative z-10` và không có nền che
- **Trang Feed, Profile, Wallet, v.v.**: Video bị che hoàn toàn bởi các lớp nền màu đặc

### Nguyên Nhân Gốc
1. **`body`** dùng `bg-background` (100% opacity - màu pearl white đặc)
2. **`.fb-card`** dùng `bg-card` (100% opacity - che hoàn toàn video)
3. **`main` containers** không trong suốt

### Thiết Kế Mong Muốn
- Hoa mai/hoa đào hiển thị ở **2 góc** của màn hình mobile
- Nội dung chính vẫn dễ đọc với nền bán trong suốt (glass effect)
- Giữ nguyên hiệu ứng đẹp như trang Auth

---

## Giải Pháp Chi Tiết

### 1. Cập nhật `src/index.css` - Body Trong Suốt

```css
body {
  @apply text-foreground;
  background: transparent; /* Bỏ bg-background để video hiển thị */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...;
}
```

### 2. Cập nhật `.fb-card` Trong Suốt

Thay đổi class `.fb-card` từ `bg-card` thành `bg-card/80`:

```css
.fb-card {
  @apply bg-card/80 rounded-lg shadow-sm border border-border;
  contain: layout style paint;
  content-visibility: auto;
  contain-intrinsic-size: auto 300px;
}
```

### 3. Cập nhật Layout Các Trang Chính

#### Feed.tsx
- Container `<main>`: Bỏ nền hoặc dùng trong suốt

#### Profile.tsx  
- Các cards trong profile: Đã có `bg-card/80` - OK
- Container chính: Đảm bảo không có nền che

#### Wallet.tsx
- Cards: Đổi sang `bg-white/80` hoặc `bg-card/80`

#### Friends.tsx
- Cards: Đổi sang `bg-card/80`

### 4. Navbar và Bottom Nav - Giữ Nguyên

- `FacebookNavbar`: Đã có `bg-card/85` - OK
- `MobileBottomNav`: Đã có `bg-white/90` - OK

---

## Files Cần Sửa

| File | Thay Đổi | Chi Tiết |
|------|----------|----------|
| `src/index.css` | Body & fb-card | Đổi sang trong suốt |
| `src/pages/Feed.tsx` | Main container | Bỏ nền đặc nếu có |
| `src/pages/Profile.tsx` | Cards | Kiểm tra và đảm bảo trong suốt |
| `src/pages/Wallet.tsx` | Cards | Đổi sang bg-white/80 |
| `src/pages/Friends.tsx` | Cards | Đổi sang bg-card/80 |
| `src/components/feed/StoriesBar.tsx` | Card container | Kiểm tra fb-card |
| `src/components/feed/FacebookPostCard.tsx` | Post card | Kiểm tra fb-card |

---

## Kết Quả Mong Đợi

1. **Video hoa mai/hoa đào** hiển thị rõ ràng ở 2 góc màn hình mobile
2. **Nội dung** vẫn dễ đọc với nền bóng kính (80% opacity)
3. **Giao diện sang trọng** như trang Auth trên toàn bộ app
4. **Trải nghiệm Tết** thống nhất từ mobile đến desktop

---

## Lưu Ý Kỹ Thuật

- Giữ nguyên `zIndex: -100` của TetBackground
- Không dùng `backdrop-blur` để giữ độ sắc nét video
- Responsive breakpoints vẫn hoạt động bình thường
- Các hiệu ứng Glass UI đã định nghĩa trong memory sẽ được áp dụng
