

# Di Chuyển Honor Board Vào Bên Trong Ảnh Bìa (Cover Photo)

## Tổng Quan

Đưa component `CoverHonorBoard` từ vị trí hiện tại (bên dưới cover, trong phần profile info) vào **bên trong khung ảnh bìa** dưới dạng overlay tuyệt đối, đặt ở phía bên phải. Giữ nguyên style/màu sắc bên trong Honor Board.

## Thay Đổi

### File duy nhất: `src/pages/Profile.tsx`

#### 1. Xóa Honor Board khỏi vị trí cũ (dòng 512-521)

Xóa block:
```tsx
{/* Honor Board - right aligned, moved down with top margin */}
<div className="hidden md:flex justify-end mt-4 md:mt-6">
  <div className="w-full max-w-[600px]">
    <CoverHonorBoard ... />
  </div>
</div>
```

#### 2. Thêm Honor Board overlay vào bên trong cover container (dòng 368-396)

Đặt Honor Board ngay trước nút "Edit Cover" bên trong `div.relative.overflow-hidden.rounded-2xl`:

```text
Cover Container (relative, overflow-hidden -> bỏ overflow-hidden hoặc đổi thành overflow-visible)
  ├── Cover Image
  ├── Gradient overlay
  ├── [MỚI] Honor Board Overlay Wrapper (absolute, right, z-20)
  │     └── CoverHonorBoard (giữ nguyên)
  └── Edit Cover Button (absolute, bottom-right)
```

#### 3. Chi tiết kỹ thuật

**Cover container**: Bỏ `overflow-hidden` để Honor Board không bị cắt (hoặc đảm bảo Honor Board nằm gọn trong cover).

**Honor Board overlay wrapper classes** (responsive):

| Breakpoint | Vị trí | Width | Hiệu ứng nền |
|-----------|--------|-------|---------------|
| Desktop (lg+) | `top-3 right-3` | `w-[clamp(300px,28vw,400px)]` | `bg-white/30 backdrop-blur-sm` |
| Tablet (md-lg) | `top-2 right-2` | `w-[clamp(240px,34vw,320px)]` | `bg-white/40 backdrop-blur-sm` |
| Mobile (<md) | `bottom-2 right-2` | `w-[220px] sm:w-[250px]` | `bg-white/50 backdrop-blur-sm` |

Wrapper: `absolute z-20 rounded-2xl p-1.5`

**Edit Cover button**: Dời sang góc trái dưới (`bottom-3 left-3`) trên desktop/tablet để không chồng lên Honor Board. Mobile giữ `bottom-3 right-3` nhưng Honor Board đặt ở `bottom-12 right-2` (cao hơn nút edit).

#### 4. Scale Honor Board cho vừa cover

Thêm `transform scale` cho CoverHonorBoard wrapper để thu nhỏ trên mobile:
- Desktop: `scale-100` (giữ nguyên)
- Tablet: `scale-90` hoặc dùng width nhỏ hơn
- Mobile: `scale-[0.75]` với `origin-bottom-right`

Hoặc đơn giản hơn: dùng CSS `max-w` + overflow đảm bảo vừa vặn, vì CoverHonorBoard đã responsive sẵn.

#### 5. Đảm bảo chiều cao cover đủ chứa Honor Board

Cover hiện có:
- Mobile: `h-[200px]` -- có thể hơi chật, tăng lên `h-[220px]` nếu cần
- Tablet: `h-[300px]` -- OK
- Desktop: `h-[400px]` -- OK

Nếu Honor Board bị cắt trên mobile, sẽ đặt Honor Board ở `bottom` thay vì `top` và cho phép nó tràn ra dưới một chút (bằng cách bỏ `overflow-hidden` trên cover container và thêm vào cover image thay thế).

### Layout sau khi sửa

```text
+------------------------------------------------------------------+
|  Cover Photo (relative)                                          |
|                                                                   |
|  [Edit Cover]              [========= HONOR BOARD =========]     |
|  (bottom-left)             (absolute, right-3, top-3)            |
|                            (rounded-2xl, bg-white/30, blur)      |
+------------------------------------------------------------------+
| [Avatar]  Username    [Bạn bè v] [Nhắn tin] [Tặng quà]          |
|           123 bạn bè                                              |
|           0x1234...abcd [copy]                                    |
+------------------------------------------------------------------+
```

Mobile:
```text
+------------------------------+
|  Cover Photo                 |
|                              |
|           [HONOR BOARD nhỏ]  |
|           (bottom-right)     |
|  [Edit]                      |
+------------------------------+
```

## Tóm tắt

Chỉ sửa 1 file `src/pages/Profile.tsx`:
1. Xóa Honor Board block cũ (dòng 512-521)
2. Thêm Honor Board overlay vào trong cover container (dòng ~383)
3. Dời nút Edit Cover sang trái dưới trên md+ để tránh chồng lấn
4. Thêm wrapper với responsive width + nền mờ nhẹ
5. Giữ nguyên hoàn toàn style bên trong CoverHonorBoard
