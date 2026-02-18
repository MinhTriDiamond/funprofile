
# Sửa lỗi AvatarOrbit — Vòng tròn nhỏ không hiển thị đúng

## Phân tích vấn đề

Có **2 vấn đề** đang xảy ra cùng lúc:

**Vấn đề 1 — Định vị sai (lỗi layout):**
Các vòng tròn nhỏ được đặt `position: absolute` tính từ `div.relative` bao quanh `{children}`. Tuy nhiên, `div` này không có kích thước cố định — kích thước phụ thuộc vào `AvatarEditor` bên trong (w-32 h-32 đến w-44 h-44 tùy màn hình). Công thức `calc(50% + Xpx)` tính `50%` từ chiều rộng của `div` wrapper này, nhưng `ORBIT_RADIUS = 115px` được cộng thêm từ tâm đó — kết quả không nhất quán giữa các màn hình và có thể render ra ngoài vùng nhìn thấy (bị `overflow: hidden` từ thẻ cha cắt mất).

**Vấn đề 2 — Chưa có data social_links:**
User chưa thêm link mạng xã hội nào qua EditProfile → mảng `social_links` rỗng → không có vòng tròn nào được render, nên con không thấy gì.

---

## Giải pháp

### Sửa `AvatarOrbit.tsx`

Đặt **wrapper cố định kích thước** có `position: relative`, với kích thước đủ chứa cả avatar + orbit. Từ đó tính toán vị trí orbit chính xác từ tâm thật sự.

**Thay đổi kỹ thuật:**

- Thêm một wrapper `div` có `width` và `height` cố định (ví dụ `200px × 200px`) tương đương kích thước avatar lớn nhất (w-44 = 176px), để `50%` luôn trỏ đúng vào tâm avatar.
- Dùng `overflow: visible` trên wrapper đó để các ô orbit không bị cắt.
- Đặt `children` (avatar) vào chính giữa wrapper bằng `absolute inset-0 flex items-center justify-center`.
- Các ô orbit cũng absolute từ cùng wrapper, tính góc đúng từ tâm.
- Tăng `paddingTop` của container ngoài cùng để kim cương không bị che.

### Kích thước avatar thực tế

Trong `AvatarEditor`, kích thước `large` = `w-32 h-32 md:w-44 md:h-44` (128px → 176px). Avatar wrapper cố định sẽ dùng `176px × 176px` (tương đương `w-44 h-44`) để làm chuẩn tâm điểm. Bán kính orbit giữ nguyên `115px`.

### Góc phân bổ (giữ logic hiện tại, chỉ sửa layout)

```
n=1 → 180° (thẳng xuống, đối xứng với kim cương ở đỉnh)
n=2 → 150°, 210°
n=3 → 120°, 180°, 240°
...
Span tối đa 260° (để tránh vùng kim cương ±50° đỉnh)
```

---

## Các file thay đổi

**`src/components/profile/AvatarOrbit.tsx`** — Sửa toàn bộ layout:
- Thêm wrapper con `div` với kích thước cố định `176px × 176px` làm tâm điểm.
- `children` đặt `absolute inset-0`, căn giữa.
- Orbit slots tính `left/top` từ `50%` của wrapper `176px` này (đúng tâm).
- Container ngoài tăng `paddingTop` lên `120px` để kim cương nhô đẹp hơn.
- Đảm bảo `overflow: visible` xuyên suốt các lớp để orbit không bị cắt.

**Không cần thay đổi** `Profile.tsx`, `EditProfile.tsx`, hay database — logic đúng rồi, chỉ layout bị sai.
