
# Kế Hoạch Thêm Nút "Tặng Quà" Vào Navigation

## Tổng Quan Yêu Cầu

| Thiết bị | Vị trí | Mô tả |
|----------|--------|-------|
| Desktop | Bên trái icon chuông (navbar trên) | Nút Gift với tooltip |
| Tablet/Mobile | Bên phải ngoài cùng (bottom nav) | Thay thế vị trí icon chuông |

---

## Phân Tích Hiện Trạng

### Desktop (FacebookNavbar.tsx)
- Cấu trúc right section: Search → Wallet (mobile) → Notification → Avatar
- Notification nằm ở line 257 trong desktop section
- Cần thêm Gift button VÀO TRƯỚC NotificationDropdown

### Mobile/Tablet (MobileBottomNav.tsx)
- Hiện tại: Home → Friends → Honor Board → Chat → Notifications
- Cần đổi thành: Home → Friends → Honor Board → Chat → **Gift**
- Icon chuông sẽ được giữ ở top navbar (đã có)

---

## Giải Pháp Chi Tiết

### 1. Tạo Component Mới: GiftNavButton

**File mới**: `src/components/donations/GiftNavButton.tsx`

Component này sẽ:
- Hiển thị icon Gift (🎁 HandCoins hoặc Gift)
- Click → Mở dialog chọn người nhận
- Hỗ trợ 2 variants: `desktop` và `mobile`

Luồng hoạt động:
```text
User click Gift button
    │
    └─► Mở Dialog chọn người nhận
            │
            ├─► Hiển thị danh sách bạn bè
            │
            └─► User chọn → Mở DonationDialog cho người đó
```

### 2. Cập Nhật Desktop Navbar

**File**: `src/components/layout/FacebookNavbar.tsx`

Thêm GiftNavButton VÀO TRƯỚC NotificationDropdown (line 257):

```text
Right Section (Logged in):
[Search] [Wallet] [🎁 Gift] [🔔 Notification] [Avatar]
                  ↑ NEW
```

Styling tương tự các icon khác với gold accent.

### 3. Cập Nhật Mobile Bottom Nav

**File**: `src/components/layout/MobileBottomNav.tsx`

Đổi navItems:
```typescript
// Trước
{ icon: Bell, label: t('notifications'), path: '/notifications' }

// Sau
{ icon: Gift, label: 'Tặng', path: null, isGift: true }
```

Vị trí mới:
```text
[Home] [Friends] [🏅] [Chat] [🎁]
                             ↑ Gift thay Notifications
```

**Lưu ý**: Notification vẫn hiện ở top navbar mobile (đã có NotificationDropdown)

---

## Thiết Kế GiftNavButton

### Props Interface
```typescript
interface GiftNavButtonProps {
  variant: 'desktop' | 'mobile';
  className?: string;
}
```

### Desktop Variant
- Tooltip "Tặng quà"
- Icon màu gold với hover effect
- Kích thước tương tự NotificationDropdown

### Mobile Variant
- Icon + Label "Tặng"
- Style giống các nav item khác
- Gold accent color

---

## Component: Chọn Người Nhận Dialog

Khi click GiftNavButton, mở dialog cho phép:
1. Hiển thị danh sách bạn bè (friendships accepted)
2. Search theo username
3. Click chọn → Mở DonationDialog với recipientId đã chọn

---

## Files Cần Thay Đổi

| # | File | Thay Đổi |
|---|------|----------|
| 1 | `src/components/donations/GiftNavButton.tsx` | **Tạo mới** - Component nút + dialog chọn người nhận |
| 2 | `src/components/layout/FacebookNavbar.tsx` | Thêm GiftNavButton desktop variant trước Notification |
| 3 | `src/components/layout/MobileBottomNav.tsx` | Thay Bell bằng Gift ở vị trí cuối cùng |

---

## UI Preview

### Desktop Navbar (Right Section)
```text
┌─────────────────────────────────────────────────────────┐
│  🔍  │  💰  │  🎁  │  🔔  │  👤  │
│      │Wallet│ Gift │ Bell │Avatar│
└─────────────────────────────────────────────────────────┘
                 ↑
            NEW BUTTON
```

### Mobile Bottom Nav
```text
┌──────────────────────────────────────────┐
│  🏠  │  👥  │  🏅  │  💬  │  🎁  │
│ Home │Friend│Honor │ Chat │ Gift │
└──────────────────────────────────────────┘
                              ↑
                      Replaces Notifications
```

---

## Kết Quả Mong Đợi

1. **Desktop**: Nút Gift nổi bật với màu gold, bên trái chuông thông báo
2. **Mobile/Tablet**: Nút Gift ở vị trí dễ tiếp cận (bên phải ngoài cùng)
3. **UX liền mạch**: Click → Chọn người nhận → Mở form tặng quà
4. **Không mất tính năng**: Notification vẫn hoạt động (desktop + mobile top bar)

---

## Timeline Ước Tính

| Task | Thời gian |
|------|-----------|
| Tạo GiftNavButton component | 15 phút |
| Dialog chọn người nhận | 15 phút |
| Cập nhật FacebookNavbar | 5 phút |
| Cập nhật MobileBottomNav | 5 phút |
| Testing | 10 phút |
| **Tổng** | **~50 phút** |
