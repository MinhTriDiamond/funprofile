

## Sửa lỗi orbit icon không hiển thị khi xem profile người khác + Kim cương sát viền avatar

### Vấn đề 1: Orbit icon biến mất khi chuyển giữa các profile
Khi điều hướng từ profile A (có social_links) sang profile B (không có), React tái sử dụng cùng component `AvatarOrbit` mà không reset state nội bộ (`localLinks`). Điều này khiến dữ liệu cũ bị "dính" lại, và logic fallback về `defaultLinks` không hoạt động đúng.

**Giải pháp**: Thêm `key={profile?.id}` vào component `AvatarOrbit` trong `Profile.tsx` để React tự động tạo mới component mỗi khi chuyển sang profile khác. Đồng thời cải thiện logic fallback trong `AvatarOrbit.tsx`.

### Vấn đề 2: Kim cương chưa sát viền avatar
Hiện tại kim cương đặt tại `top: 82px` trong wrapper 486px. Cần điều chỉnh để mũi nhọn phía dưới chạm sát viền tròn của avatar.

**Giải pháp**: Tính toán lại vị trí: Avatar tâm tại 243px (center wrapper), avatar radius ~88px (176/2), nên đỉnh avatar ở ~155px. Kim cương 100px, nên `top = 155 - 100 = 55px` để mũi nhọn chạm sát.

### Chi tiết kỹ thuật

**File 1: `src/pages/Profile.tsx`**
- Thêm `key={profile?.id}` vào `<AvatarOrbit>` để force remount khi đổi profile:
```tsx
<AvatarOrbit
  key={profile?.id}
  socialLinks={...}
  ...
>
```

**File 2: `src/components/profile/AvatarOrbit.tsx`**
1. Cải thiện logic fallback `displayLinks`:
   - Kiểm tra cả trường hợp user có `social_links` nhưng tất cả đều rỗng (không có URL nào)
   - Đảm bảo luôn hiển thị đủ 9 icon cho mọi user: nếu user đã có một số link, bổ sung thêm các platform còn thiếu với icon mặc định

2. Điều chỉnh vị trí kim cương từ `top: 82px` sang `top: 55px` để mũi nhọn chạm sát viền tròn avatar.

### Kết quả mong đợi
- Mọi profile đều hiển thị đủ 9 icon orbit xoay quanh avatar
- Chuyển giữa các profile luôn hiển thị đúng
- Kim cương nằm sát viền tròn avatar như hình mẫu
