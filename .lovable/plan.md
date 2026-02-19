
## Sửa Avatar Orbit trên Mobile & Kim Cương Tĩnh

### Vấn đề 1: Avatar nhỏ không hiển thị trên mobile

**Nguyên nhân gốc rễ:**
- Container `.relative` bao quanh `AvatarOrbit` trong `Profile.tsx` có class `-mt-[193px]` (âm margin lớn). Các `<div>` cha bao bọc phần thông tin profile (`bg-card/80 border-b ...`) **không có** `overflow: visible`, khiến các slot xoay (nằm ngoài bounds của `AvatarOrbit` container 176×176px) bị **clip ẩn** trên một số thiết bị/trình duyệt mobile.
- Các slot xoay dùng `position: absolute` với tọa độ vượt ra ngoài container 176×176px (ORBIT_RADIUS = 115px), cộng với ORBIT_SIZE/2 = 20px → các slot có thể nằm cách tâm tới **135px** ra ngoài bounds → bị cha clip mất.

**Giải pháp:**
1. Sửa `AvatarOrbit.tsx`: Tăng kích thước container wrapper từ `176×176px` thành đủ rộng để chứa toàn bộ orbit (`(AVATAR_SIZE + ORBIT_RADIUS*2 + ORBIT_SIZE)px`), giữ avatar ở chính giữa. Thêm `overflow: visible` rõ ràng trên tất cả các container liên quan.
2. Sửa `Profile.tsx`: Thêm `overflow: visible` vào div bao bọc `AvatarOrbit` để đảm bảo slot không bị clip.
3. Đảm bảo `baseAnglesRef.current` được set **trước** animation loop, không phải trong render function.

### Vấn đề 2: Kim cương chuyển động

**Nguyên nhân:**
- Class `.diamond-sparkle` trong `src/index.css` đang apply **cả hai** animation:
  ```css
  animation: diamond-glow 2.8s ease-in-out infinite, diamond-float 4.5s ease-in-out infinite;
  ```
- `diamond-float` làm kim cương lơ lửng lên xuống và xoay nhẹ.

**Giải pháp:**
- Bỏ `diamond-float` khỏi `.diamond-sparkle`, chỉ giữ `diamond-glow`.
- Đồng thời cập nhật `transform` tĩnh trên element kim cương trong `AvatarOrbit.tsx` (bỏ `willChange: transform` vì không còn transform animation).

---

### Chi tiết kỹ thuật thay đổi

**File 1: `src/index.css`**
```css
/* Chỉ giữ glow, bỏ float */
.diamond-sparkle {
  animation: diamond-glow 2.8s ease-in-out infinite;
}
```

**File 2: `src/components/profile/AvatarOrbit.tsx`**
- Tăng wrapper container thành `(AVATAR_SIZE + (ORBIT_RADIUS + ORBIT_SIZE) * 2)px` × `(AVATAR_SIZE + (ORBIT_RADIUS + ORBIT_SIZE) * 2)px`  
  = `(176 + 155*2)px` = `486px` × `486px`
- Đặt avatar tuyệt đối ở chính giữa container lớn
- Tính tọa độ slot dựa trên tâm của container lớn
- Thêm `overflow: visible` tường minh trên wrapper
- Bỏ `willChange: 'transform, filter'` trên kim cương (chỉ còn filter animation)

**File 3: `src/pages/Profile.tsx`**
- Thêm `style={{ overflow: 'visible' }}` vào div `-mt-[193px]` bao quanh `AvatarOrbit`

### Danh sách file sửa

| File | Thay đổi |
|------|----------|
| `src/index.css` | Bỏ `diamond-float` khỏi `.diamond-sparkle` |
| `src/components/profile/AvatarOrbit.tsx` | Tăng container wrapper, đảm bảo overflow visible |
| `src/pages/Profile.tsx` | Thêm overflow visible cho wrapper |
