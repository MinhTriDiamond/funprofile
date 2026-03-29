

## Chuyển nút Nhạc từ Bottom Nav lên Navbar (mobile)

### Vấn đề
Nút Nhạc đang nằm trong `MobileBottomNav` (thanh dưới cùng), đè lên nút Tặng quà.

### Giải pháp
Di chuyển nút Nhạc lên thanh navbar trên cùng (cạnh nút Ví và Tìm kiếm) trên mobile.

### Bước 1: Thêm nút Nhạc vào navbar mobile
**File:** `src/components/layout/FacebookNavbar.tsx`
- Trong phần Right Section, thêm `<ValentineMusicButton variant="mobile" />` cho mobile/tablet, đặt cạnh nút Search và Wallet (trước Notification).
- Giữ nguyên nút desktop ở vị trí cũ.

### Bước 2: Bỏ nút Nhạc khỏi Bottom Nav
**File:** `src/components/layout/MobileBottomNav.tsx`
- Xóa item `{ isMusic: true }` khỏi mảng `navItems`.
- Xóa import `ValentineMusicButton` và đoạn render nút nhạc.

### Bước 3: Chỉnh style nút Nhạc cho phù hợp navbar
**File:** `src/components/layout/ValentineMusicButton.tsx`
- Variant mobile: thu nhỏ kích thước cho vừa với navbar (dùng style tương tự `fun-icon-btn-gold` thay vì style bottom nav hiện tại).

### File thay đổi
1. `src/components/layout/FacebookNavbar.tsx` — thêm music button mobile
2. `src/components/layout/MobileBottomNav.tsx` — bỏ music button
3. `src/components/layout/ValentineMusicButton.tsx` — chỉnh style variant mobile cho navbar

