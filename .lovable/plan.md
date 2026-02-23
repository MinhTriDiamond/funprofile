

# Sửa Hiển Thị Trạng Thái "Đình Chỉ" Trong Danh Sách Thành Viên

## Van De

Bộ lọc "Đình chỉ" hoạt động đúng (có 86 user với `reward_status = 'on_hold'` trong database), nhưng giao diện có 2 lỗi:

1. **Cột Trạng thái chỉ hiển thị 2 loại**: "Hoạt động" hoặc "Cấm" - không bao giờ hiện "Đình chỉ", nên user bị đình chỉ vẫn hiện "Hoạt động" gây nhầm lẫn.
2. **Bộ lọc "Đình chỉ" cũng hiện cả user đã bị Cấm**: vì một số user vừa bị `is_banned = true` vừa có `reward_status = 'on_hold'`.

## Giai Phap

### File: `src/pages/Users.tsx`

**1. Cập nhật cột Trạng thái (dòng 188-193)** để hiển thị 3 loại:
- "Cấm" (đỏ) - khi `is_banned = true`
- "Đình chỉ" (cam) - khi `reward_status === 'on_hold'` và chưa bị cấm
- "Hoạt động" (xanh) - còn lại

```
Cấm       -> Badge destructive (đỏ)
Đình chỉ  -> Badge cam/vàng
Hoạt động -> Badge xanh
```

### File: `src/hooks/useUserDirectory.ts`

**2. Tinh chỉnh bộ lọc suspended (dòng 216)** để loại trừ user đã bị cấm vĩnh viễn:

```
suspended -> reward_status === 'on_hold' AND is_banned === false
```

Chỉ sửa 2 file, thay đổi nhỏ.

