
# Kế Hoạch Chỉnh Sửa Profile Page

## Tổng Quan
Điều chỉnh giao diện Profile theo 5 yêu cầu:
1. Tăng kích thước ảnh đại diện
2. Mở rộng bảng Honor Board sát góc phải như ảnh bìa
3. Tăng kích thước tổng thể của Honor Board
4. Chỉnh các ô stat thành hình viên thuốc (pill shape)
5. Nền bảng Honor Board bóng kính trong suốt (glassmorphism)
6. Bỏ ô "Shares" và "Livestream"

---

## Chi Tiết Thay Đổi

### 1. Tăng Kích Thước Ảnh Đại Diện

**File: `src/pages/Profile.tsx`**
- Avatar cho người xem: `w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44` -> `w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52`

**File: `src/components/profile/AvatarEditor.tsx`**
- Thêm size "xl" mới với kích thước `w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52`
- Cập nhật button camera position phù hợp

---

### 2. Mở Rộng Honor Board Sát Góc Phải

**File: `src/pages/Profile.tsx`**
- Container Honor Board: `max-w-[480px]` -> `max-w-[600px]` với `w-full`
- Đảm bảo board căn sát phải và cùng vị trí với edge của cover photo

---

### 3. Nền Bóng Kính Trong Suốt (Glassmorphism)

**File: `src/components/profile/CoverHonorBoard.tsx`**
- Container chính thay đổi:
  - Xóa: `bg-gradient-to-br from-green-900/95 via-green-800/95 to-emerald-900/95`
  - Thêm: `bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]`
- Tạo hiệu ứng glass effect với inner glow nhẹ

---

### 4. Chỉnh Stat Items Thành Hình Viên Thuốc (Pill Shape)

**File: `src/components/profile/CoverHonorBoard.tsx`**
- StatRow component:
  - Thay `rounded-lg` thành `rounded-full`
  - Tăng padding ngang: `px-2 sm:px-2.5` -> `px-3 sm:px-4`
  - Nền semi-transparent: `bg-gradient-to-b from-[#1a7d45]/80 via-[#166534]/80 to-[#0d4a2a]/80 backdrop-blur-sm`
  - Giữ border vàng và shadow glow

---

### 5. Bỏ Ô Shares và Livestream

**File: `src/components/profile/CoverHonorBoard.tsx`**
- **Left Column**: Giữ Posts, Reactions, Comments (bỏ Shares)
- **Right Column**: Giữ Friends, Claimable, Claimed (bỏ Livestream)
- Layout giảm từ 8 ô -> 6 ô (3 mỗi cột)

---

## Kết Quả Mong Đợi

| Thành phần | Trước | Sau |
|------------|-------|-----|
| Avatar size | 176px (md) | 208px (md) |
| Honor Board width | max 480px | max 600px |
| Stat shape | Rounded corners | Pill (rounded-full) |
| Background | Solid green gradient | Glass blur transparent |
| Stat items | 8 items | 6 items (bỏ Shares, Livestream) |

---

## Các File Cần Chỉnh Sửa

1. `src/pages/Profile.tsx` - Avatar size, Honor Board container width
2. `src/components/profile/AvatarEditor.tsx` - Thêm size "xl"
3. `src/components/profile/CoverHonorBoard.tsx` - Glassmorphism, pill shape, bỏ 2 ô

