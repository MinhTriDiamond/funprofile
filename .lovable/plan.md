

# Sửa Lỗi Dropdown "Ai Có Thể Nhắn Tin" Không Bấm Được

## Nguyên nhân
Khi dùng Radix Select bên trong Radix Dialog, lớp overlay của Dialog đặt `pointer-events: none` lên toàn trang, khiến dropdown menu của Select bị chặn tương tác. Đây là lỗi phổ biến khi kết hợp 2 component portal của Radix UI.

## Giải pháp
Sửa file `src/modules/chat/components/ChatSettingsDialog.tsx` -- thêm className cho `SelectContent` để ghi đè `pointer-events` và đảm bảo z-index đủ cao.

## Chi tiết kỹ thuật

### File cần sửa: `src/modules/chat/components/ChatSettingsDialog.tsx`

Thay đổi `SelectContent` (khoảng dòng 62) từ:
```tsx
<SelectContent>
```
thành:
```tsx
<SelectContent className="pointer-events-auto z-[9999]">
```

Chỉ thêm 2 class CSS:
- `pointer-events-auto`: ghi đè `pointer-events: none` từ Dialog overlay
- `z-[9999]`: đảm bảo dropdown hiển thị trên Dialog

Chỉ sửa 1 dòng trong 1 file duy nhất.

