
# Kế Hoạch Hiển Thị Hoa Mai/Hoa Đào Rõ Nét & Đậm Nét

## Phân Tích Vấn Đề Hiện Tại

Qua kiểm tra screenshot và code, tôi phát hiện các vấn đề sau:

### 1. Video đã căn đúng vị trí (top-0 + object-top)
Video đã được sửa để hiển thị phần trên với hoa mai/hoa đào - đây là đúng.

### 2. Overlay gradient vẫn làm mờ hoa ở giữa
Hiện tại overlay có opacity 0.4-0.5 ở vùng giữa, làm hoa bị mờ.

### 3. Sidebars chiếm diện tích lớn ở 2 bên
- Left sidebar: 3 cột (25%)
- Right sidebar: 3 cột (25%)
- Mặc dù đã có `bg-card/80 backdrop-blur-sm`, vẫn che phủ hoa ở 2 bên

### 4. Navbar che phần trên cùng
Navbar có `fb-header` (bg-card solid) che mất phần hoa ở góc trên.

---

## Giải Pháp Đề Xuất

### Bước 1: Xóa hoàn toàn overlay gradient
Bỏ overlay che phủ video để hoa hiển thị rõ nét 100% - không có lớp mờ nào cả.

**File:** `src/components/ui/TetBackground.tsx`
```tsx
// XÓA hoàn toàn div overlay gradient
// Chỉ giữ lại video nền không có gì che
```

### Bước 2: Làm trong suốt Navbar
Thay đổi navbar từ solid background sang semi-transparent để hoa ở góc trên hiển thị.

**File:** `src/index.css`
```css
/* Cập nhật fb-header */
.fb-header {
  @apply bg-card/85 backdrop-blur-md shadow-sm border-b border-border;
}
```

### Bước 3: Tăng độ trong suốt cho Sidebars
Giảm opacity của sidebars để hoa hiển thị rõ hơn ở 2 bên.

**File:** `src/components/feed/FacebookLeftSidebar.tsx`
**File:** `src/components/feed/FacebookRightSidebar.tsx`
```tsx
// Thay đổi từ bg-card/80 → bg-card/70
// Giữ backdrop-blur-sm để vẫn đọc được chữ
```

### Bước 4: Tăng độ trong suốt cho các Card trong Sidebar
Các card FUN Ecosystem, Your Shortcuts, Menu... cần trong suốt hơn.

**File:** `src/components/feed/FacebookLeftSidebar.tsx`
```tsx
// Card 1, 2, 3: từ bg-card/80 → bg-card/70
```

### Bước 5: Cập nhật toàn bộ các trang
Đảm bảo tất cả các trang (Profile, Friends, Chat, Wallet, Leaderboard, Benefactors, Notifications, About, Post, ConnectedApps, Admin) đều có cùng thiết lập trong suốt.

---

## Chi Tiết File Cần Chỉnh Sửa

| File | Thay Đổi |
|------|----------|
| `src/components/ui/TetBackground.tsx` | Xóa overlay gradient hoàn toàn |
| `src/index.css` | fb-header → bg-card/85 backdrop-blur-md |
| `src/components/feed/FacebookLeftSidebar.tsx` | bg-card/80 → bg-card/70 cho tất cả cards |
| `src/components/feed/FacebookRightSidebar.tsx` | bg-card/80 → bg-card/70 cho tất cả cards |
| `src/components/feed/AppHonorBoard.tsx` | bg-card/80 → bg-card/70 |
| `src/components/feed/TopRanking.tsx` | bg-card/80 → bg-card/70 |

---

## Kết Quả Mong Đợi

Sau khi hoàn thành:
- Hoa mai/hoa đào hiển thị rõ nét 100% ở góc trên bên trái và phải
- Đèn lồng đỏ nhìn thấy rõ ràng
- Cánh hoa bay động thấy rõ trên toàn màn hình
- Navbar và sidebars vẫn đọc được nhưng thấy hoa xuyên qua
- Video nền động sống động, tràn đầy năng lượng Tết

---

## Sơ Đồ Minh Họa

```text
╔═══════════════════════════════════════════════════════════════╗
║ 🏮 HOA ĐÀO      [Navbar trong suốt]              HOA MAI 🏮   ║
║ (hiển thị rõ)                                    (hiển thị rõ)║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  [Sidebar/70%]    [Content/80%]     [Sidebar/70%]             ║
║  hoa xuyên qua    vẫn dễ đọc        hoa xuyên qua             ║
║                                                               ║
║               🌸 cánh hoa bay động 🌸                          ║
║               (hiển thị rõ trên toàn màn hình)                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```
