
# Kế Hoạch Chỉnh Sửa Nền Bóng Kính Cho Tất Cả Các Trang

## Phân Tích Vấn Đề

Qua kiểm tra code và screenshots con gửi, tôi phát hiện các trang sau đang dùng **nền đặc (solid background)** khiến video hoa mai/hoa đào không hiển thị:

### 1. Trang Bạn Bè (Friends.tsx)
- **Sidebar bên trái (dòng 229)**: `bg-card` - nền đặc hoàn toàn
- **Mobile Header (dòng 292)**: `bg-card` - nền đặc
- **Các card bạn bè**: `bg-card` - nền đặc
- **Container đường dây 389**: `bg-card` - nền đặc

### 2. Trang Tin Nhắn (Chat.tsx)
- **Mobile header (dòng 95)**: `bg-card` - nền đặc
- **Desktop sidebar (dòng 183)**: `bg-card` - nền đặc
- **Conversation list container**: nền đặc

### 3. Trang Thông Báo (Notifications.tsx)
- **Container chính (dòng 235)**: `bg-background` - nền đặc
- **Header (dòng 237)**: `bg-background/95` - gần như nền đặc

### 4. Component FriendCarousel (FriendCarousel.tsx)
- **Card bạn bè (dòng 164)**: `bg-card` - nền đặc

### 5. Trang Wallet (WalletCenterContainer.tsx)
- **Các card (dòng 483)**: `bg-white` - nền trắng đặc

---

## Giải Pháp

Áp dụng hiệu ứng **bóng kính (glass effect)** cho tất cả các component bằng cách:
- Thay `bg-card` → `bg-card/70` hoặc `bg-card/80`
- Thay `bg-background` → xóa bỏ hoặc `bg-background/70`
- Thay `bg-white` → `bg-white/70`

---

## Chi Tiết Thay Đổi Theo File

### File 1: `src/pages/Friends.tsx`

| Dòng | Trước | Sau |
|------|-------|-----|
| 229 | `bg-card shadow-lg` | `bg-card/80 shadow-lg` |
| 292 | `bg-card border-b` | `bg-card/80 border-b` |
| 389 | `bg-card rounded-xl` | `bg-card/70 rounded-xl` |
| 399 | `bg-card rounded-xl` | `bg-card/70 rounded-xl` |

### File 2: `src/pages/Chat.tsx`

| Dòng | Trước | Sau |
|------|-------|-----|
| 95 | `bg-card` | `bg-card/80` |
| 183 | `bg-card flex` | `bg-card/80 flex` |

### File 3: `src/pages/Notifications.tsx`

| Dòng | Trước | Sau |
|------|-------|-----|
| 235 | `bg-background` | (xóa bỏ) |
| 237 | `bg-background/95` | `bg-card/80` |

### File 4: `src/components/friends/FriendCarousel.tsx`

| Dòng | Trước | Sau |
|------|-------|-----|
| 164 | `bg-card rounded-xl` | `bg-card/70 rounded-xl` |

### File 5: `src/components/wallet/WalletCenterContainer.tsx`

| Dòng | Trước | Sau |
|------|-------|-----|
| 483 | `bg-white rounded-2xl` | `bg-white/80 rounded-2xl` |
| Và các vị trí khác dùng `bg-white` | `bg-white` | `bg-white/70` hoặc `bg-white/80` |

---

## Kết Quả Mong Đợi

Sau khi hoàn thành:

```text
╔══════════════════════════════════════════════════════════════╗
║ 🏮 HOA ĐÀO        [Navbar 85%]             HOA MAI 🏮       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌────────────────┐  ┌──────────────────────────────────┐   ║
║  │ Sidebar        │  │  Main Content                    │   ║
║  │ (bg-card/80)   │  │  (trong suốt - thấy hoa)         │   ║
║  │                │  │                                  │   ║
║  │ 🌸 hoa hiện rõ │  │  ┌────────────────────────────┐  │   ║
║  │                │  │  │ Card Item (bg-card/70)     │  │   ║
║  │                │  │  │ 🌺 thấy hoa xuyên qua      │  │   ║
║  │                │  │  └────────────────────────────┘  │   ║
║  │                │  │                                  │   ║
║  └────────────────┘  └──────────────────────────────────┘   ║
║                                                              ║
║              🌸 cánh hoa bay động hiện rõ 🌸                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Tổng Quan Files Cần Chỉnh Sửa

1. **src/pages/Friends.tsx** - 4 vị trí
2. **src/pages/Chat.tsx** - 2 vị trí  
3. **src/pages/Notifications.tsx** - 2 vị trí
4. **src/components/friends/FriendCarousel.tsx** - 1 vị trí
5. **src/components/wallet/WalletCenterContainer.tsx** - Nhiều vị trí dùng `bg-white`

Tổng cộng: **5 files** cần chỉnh sửa

---

## Lưu Ý Kỹ Thuật

- Độ trong suốt `70%` (`bg-card/70`) cho card/item nhỏ
- Độ trong suốt `80%` (`bg-card/80`) cho sidebar/header lớn
- Giữ nguyên `shadow-sm` và `border` để card vẫn có chiều sâu
- Video hoa mai/hoa đào sẽ hiển thị xuyên qua các lớp trong suốt
