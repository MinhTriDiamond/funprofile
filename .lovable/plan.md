
# Kế hoạch cập nhật UI Mobile + Bảng Danh Dự + Nút Avatar Profile

## 3 thay đổi chính

### 1. Thêm nút Avatar ở góc dưới bên phải thanh công cụ (như Facebook)
Trên mobile/tablet, thanh `FacebookNavbar` hiện **không có** nút avatar để truy cập trang cá nhân. Con muốn thêm nút avatar ở góc phải thanh navbar trên — giống Facebook — để người dùng bấm vào là vào thẳng trang Profile.

**Vị trí thêm:** Trong `FacebookNavbar.tsx`, khu vực "Right Section" dành cho `isMobileOrTablet && isLoggedIn`, thêm nút Avatar nhỏ (tương tự desktop) sau NotificationDropdown. Bấm vào sẽ `navigate('/profile/{currentUserId}')`.

**Thiết kế nút:**
- Avatar tròn 32x32px, viền vàng nhạt
- Khi bấm → vào trang Profile của mình
- Nếu chưa đăng nhập → ẩn đi

---

### 2. Thu gọn Bảng Danh Dự (CoverHonorBoard) trong ảnh bìa Profile
Hiện tại `CoverHonorBoard` có `max-w-[420px]` và khá lớn, chiếm nhiều không gian trong ảnh bìa. Sẽ thu gọn lại:

- Giảm padding từ `p-3 sm:p-4` → `p-2 sm:p-3`
- Giảm kích thước header (title nhỏ hơn, avatar nhỏ hơn)
- Giảm `max-w-[420px]` → `max-w-[340px]`
- Giảm khoảng cách giữa các hàng stat
- StatRow: giảm `py-1.5` → `py-1`, icon nhỏ từ `w-3.5 h-3.5` → `w-3 h-3`
- Grid gap: `gap-1.5` → `gap-1`

---

### 3. Cập nhật giao diện Mobile tổng thể (MobileBottomNav)
Cải thiện thanh bottom nav cho mobile:

- Tăng chiều cao từ `h-[72px]` → `h-[68px]` để gọn hơn
- Các icon nav nhỏ gọn hơn một chút
- Đảm bảo nút Avatar mới ở navbar trên (khoản 1) không bị chồng lên với các nút hiện tại

---

## File sẽ sửa

| File | Thay đổi |
|------|----------|
| `src/components/layout/FacebookNavbar.tsx` | Thêm nút avatar mobile vào Right Section |
| `src/components/profile/CoverHonorBoard.tsx` | Thu gọn kích thước Bảng Danh Dự |
| `src/components/layout/MobileBottomNav.tsx` | Tinh chỉnh giao diện mobile |

---

## Technical Notes

**Nút Avatar Mobile trong Navbar:**
```tsx
{/* Avatar - Navigate to Profile (Mobile/Tablet) */}
{isMobileOrTablet && isLoggedIn && currentUserId && (
  <button
    onClick={() => navigate(`/profile/${currentUserId}`)}
    aria-label="My Profile"
    className="flex-shrink-0"
  >
    <Avatar className="w-8 h-8 border-2 border-gold/40 hover:border-gold transition-colors">
      <AvatarImage src={profile?.avatar_url || ''} />
      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
        {profile?.username?.[0]?.toUpperCase() || 'U'}
      </AvatarFallback>
    </Avatar>
  </button>
)}
```

Nút này được đặt **sau** `NotificationDropdown` trong Right Section của navbar, phù hợp với layout Facebook (avatar luôn ở ngoài cùng bên phải).
