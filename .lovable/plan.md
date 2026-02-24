

# Sửa lỗi ảnh bạn bè không thay đổi kích thước

## Nguyên nhân
Code đã được cập nhật đúng, nhưng component Avatar mặc định có kích thước cố định `h-10 w-10` (40x40px). Khi truyền `w-full aspect-square`, `w-full` ghi đè được `w-10`, nhưng `h-10` vẫn giữ nguyên khiến avatar bị giới hạn chiều cao 40px -- không thể mở rộng theo grid.

## Giải pháp
Thêm `h-auto` vào className của Avatar trong mục bạn bè để ghi đè `h-10` mặc định, cho phép avatar tự co giãn theo chiều rộng grid.

## Chi tiết kỹ thuật

### File: `src/pages/Profile.tsx` (dong 846)

Thay doi:
```
Avatar className="w-full aspect-square rounded-xl mb-1 border border-border overflow-hidden"
```
Thanh:
```
Avatar className="w-full h-auto aspect-square rounded-xl mb-1 border border-border overflow-hidden"
```

### Ket qua
- Avatar se tu dong mo rong theo kich thuoc cua o grid (khoang 1/3 chieu rong card)
- Hinh anh ban be se to, ro net giong Facebook nhu anh tham khao
