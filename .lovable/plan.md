

# Sửa lỗi chữ tràn trong popover thông báo

## Nguyên nhân

Component `PopoverContent` (từ Radix UI) có class mặc định `w-72` (= 288px). Trong `NotificationDropdown.tsx`, nội dung bên trong được đặt `w-[380px]`, vượt quá kích thước container → chữ tràn ra ngoài.

## Giải pháp

Trong file `src/components/layout/NotificationDropdown.tsx`, thêm class `w-auto` vào `PopoverContent` để ghi đè `w-72` mặc định, cho phép popover tự mở rộng theo nội dung bên trong.

Cụ thể, sửa 2 chỗ dùng `PopoverContent` (dòng 286 và 309):

```tsx
// Trước
<PopoverContent className="p-0 border-border" ...>

// Sau
<PopoverContent className="p-0 border-border w-auto" ...>
```

Chỉ cần thay đổi 1 file, 2 dòng.

