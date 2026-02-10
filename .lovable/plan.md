
# Làm Nổi Bật Địa Chỉ Ví Trên Trang Profile

## Mục tiêu

Điều chỉnh style hiển thị địa chỉ ví công khai ngay dưới tên user để nổi bật hơn, dễ nhận biết hơn thay vì màu `text-muted-foreground` mờ nhạt hiện tại.

## Thay đổi

### File duy nhất: `src/pages/Profile.tsx` (dòng 464-503)

Cập nhật style cho block hiển thị ví:

| Thành phần | Hiện tại | Sau khi sửa |
|-----------|---------|-------------|
| Container | `flex items-center gap-2 mt-1` | `inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20` |
| Icon Wallet | `w-4 h-4 text-muted-foreground` | `w-4 h-4 text-primary` |
| Địa chỉ text | `text-sm text-muted-foreground font-mono` | `text-sm text-foreground font-mono font-medium` |
| Nút Copy | `text-muted-foreground` | `text-primary hover:text-primary/80` |

Thay đổi chính:
- Thêm nền nhạt `bg-primary/10` + viền `border-primary/20` tạo thành badge/chip nổi bật
- Bo tròn `rounded-full` giống style pill/tag
- Icon ví đổi sang màu `text-primary` (xanh lá) thay vì xám
- Text địa chỉ đổi sang `text-foreground font-medium` để đậm và rõ hơn
- Nút copy cũng đổi sang màu primary
- Tăng `mt-1` thành `mt-2` để có khoảng cách hợp lý

Kết quả: Dòng ví sẽ hiển thị như một badge/chip nổi bật ngay dưới tên, dễ nhận biết trên cả desktop và mobile.
