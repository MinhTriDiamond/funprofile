
# Kế Hoạch Hiển Thị Hoa Mai/Hoa Đào Rõ Nét Trên Toàn Bộ Fun Profile

## Mục Tiêu
- Hiển thị video hoa mai/hoa đào rõ nét, đậm nét ở các góc màn hình
- Đảm bảo hoa hiển thị ngay khi nhìn vào trang (không bị che khuất)
- Áp dụng đồng nhất trên tất cả các trang chính (Feed, Profile, Friends, Chat, Wallet, v.v.)
- Giao diện sang trọng, tươi mới, ngập tràn năng lượng Tết

---

## Phân Tích Vấn Đề Hiện Tại

1. **Overlay gradient quá đậm ở giữa**: 75% opacity làm mờ hoa
2. **Sidebars có background đục**: `bg-card` che hết video nền ở hai bên
3. **Các card component dùng màu nền solid**: Không cho phép video xuyên qua
4. **Khoảng cách 2cm hai bên**: Đủ rộng nhưng nền vẫn bị che bởi sidebar

---

## Giải Pháp Đề Xuất

### Bước 1: Điều Chỉnh TetBackground Component
Giảm độ mờ của overlay gradient ở hai bên để hoa hiển thị rõ hơn:

```text
Trước: rgba(255,255,255,0.1) 0% → rgba(255,255,255,0.75) 50%
Sau:   rgba(255,255,255,0) 0% → rgba(255,255,255,0.5) 50%
```

Thay đổi cụ thể:
- Hai bên: giảm từ 0.1 xuống 0 (trong suốt hoàn toàn)
- Giữa: giảm từ 0.75 xuống 0.5 (vẫn đọc được chữ nhưng thấy hoa)
- Vùng 15% và 85%: giảm từ 0.6 xuống 0.3

### Bước 2: Làm Trong Suốt Sidebars
Thay đổi background của sidebars từ solid sang semi-transparent:

```text
Trước: bg-card (solid white)
Sau:   bg-card/80 backdrop-blur-sm (semi-transparent with blur)
```

### Bước 3: Cập Nhật Sidebar Cards
Thay đổi border và background của các card trong sidebar để hoa có thể "xuyên qua":

- `FacebookLeftSidebar`: Các card dùng `bg-card/90 backdrop-blur-sm`
- `FacebookRightSidebar`: Các card dùng `bg-card/90 backdrop-blur-sm`

### Bước 4: Điều Chỉnh Feed Main Content
Để vùng giữa vẫn dễ đọc nhưng hai bên rõ hoa:

- Main feed container: giữ nguyên `bg-card` cho các post card (dễ đọc)
- Khoảng trống hai bên: trong suốt để thấy hoa

---

## Chi Tiết File Cần Chỉnh Sửa

### 1. src/components/ui/TetBackground.tsx
```tsx
// Gradient mới - trong suốt hơn ở hai bên
background: `
  linear-gradient(
    to right,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.3) 15%,
    rgba(255,255,255,0.5) 50%,
    rgba(255,255,255,0.3) 85%,
    rgba(255,255,255,0) 100%
  )
`
```

### 2. src/components/feed/FacebookLeftSidebar.tsx
Thay đổi background các card từ `bg-card` thành `bg-card/90 backdrop-blur-sm`:
- Card FUN Ecosystem
- Card Your Shortcuts
- Card Menu

### 3. src/components/feed/FacebookRightSidebar.tsx
Thay đổi background các card từ `fb-card` thành phiên bản semi-transparent:
- AppHonorBoard container
- TopRanking container
- Sponsored card
- Contacts section
- Birthdays card

### 4. src/pages/Feed.tsx
Đảm bảo sidebar containers trong suốt:
- Left sidebar wrapper: thêm transparency
- Right sidebar wrapper: thêm transparency

### 5. Các trang khác cần cập nhật
Áp dụng pattern tương tự cho:
- Profile.tsx
- Friends.tsx
- Chat.tsx
- Wallet.tsx
- Leaderboard.tsx
- Benefactors.tsx
- Notifications.tsx
- About.tsx
- Post.tsx
- ConnectedApps.tsx
- Admin.tsx

---

## CSS Helper Classes Mới

Thêm vào src/index.css:

```css
/* Tet-themed transparent cards */
.tet-card {
  @apply bg-card/90 backdrop-blur-sm rounded-xl border border-border;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.tet-card-strong {
  @apply bg-card/95 backdrop-blur-md rounded-xl border border-border;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

---

## Kết Quả Mong Đợi

Sau khi hoàn thành:
- Hoa mai/hoa đào hiển thị rõ nét ở 2 bên góc màn hình (như hình mẫu)
- Video nền động với cánh hoa bay nhẹ nhàng
- Các card và nội dung vẫn dễ đọc với backdrop blur
- Giao diện sang trọng, tươi mới, mang không khí Tết
- Áp dụng đồng nhất trên toàn bộ ứng dụng

---

## Thứ Tự Thực Hiện

1. Cập nhật TetBackground.tsx (gradient mới)
2. Thêm CSS helper classes vào index.css
3. Cập nhật FacebookLeftSidebar.tsx
4. Cập nhật FacebookRightSidebar.tsx
5. Cập nhật Feed.tsx và các trang chính khác
6. Kiểm tra và tinh chỉnh độ trong suốt nếu cần
