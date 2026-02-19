
## Thay nút Avatar thành nút Quà tặng trên MobileBottomNav

### Thay đổi
Trong file `src/components/layout/MobileBottomNav.tsx`:

1. Thay thế nút Avatar (vị trí cuối cùng trong `navItems`) bằng nút Gift icon (dùng `Gift` từ lucide-react) với style màu vàng gold tương tự `GiftNavButton`.
2. Khi click, mở `UnifiedGiftSendDialog` ở mode "navbar".
3. Giữ nguyên nút Avatar ở góc trên bên phải (FacebookNavbar) -- không thay đổi gì.

### Chi tiết kỹ thuật

**File: `src/components/layout/MobileBottomNav.tsx`**

- Import thêm `Gift` từ lucide-react và `UnifiedGiftSendDialog` từ donations.
- Thêm state `giftDialogOpen`.
- Thay item `{ isAvatar: true }` cuối mảng `navItems` thành `{ isGift: true }`.
- Render nút Gift với icon Gift màu gold, label "Quà", click mở dialog.
- Render `UnifiedGiftSendDialog` ở cuối component.
- Bỏ các query `myProfile` vì không còn cần avatar trong bottom nav (giữ `currentUser` vì Honor Board vẫn cần).
