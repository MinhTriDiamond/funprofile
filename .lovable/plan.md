

## Kế hoạch: Sửa layout nút xuất PDF và refresh trên mobile

### Vấn đề
- Trên điện thoại dọc: nút Download PDF và Refresh nằm `absolute right-0` trong DialogTitle, chồng lên chữ tiêu đề
- Trên điện thoại xoay ngang: bảng summary bị cắt cột cuối ("Lệnh" bên phải bị mất)

### Giải pháp

#### File: `src/components/profile/WalletTransactionHistory.tsx`

**1. Di chuyển 2 nút (PDF + Refresh) ra khỏi DialogTitle**
- Xóa `div.absolute.right-0` chứa 2 nút ra khỏi DialogTitle
- Đặt 2 nút vào hàng filter (dòng 509), nằm cạnh nút "Đến ngày" ở góc phải
- Bỏ `position: absolute` → dùng flow layout bình thường

**2. Cấu trúc hàng filter mới**
```
[Filter icon] [Tất cả] [Đã nhận] [Đã tặng]  ...  [PDF] [Refresh] [Từ ngày] [Đến ngày] [X]
```
Trên mobile sẽ tự wrap xuống dòng nhờ `flex-wrap`.

**3. Đảm bảo bảng summary không bị cắt khi xoay ngang**
- Bảng đã có `overflow-x-auto` — kiểm tra container có `max-w-[95vw]` đang hoạt động đúng
- Thêm `min-w-0` cho container bảng nếu cần để flex không bị tràn

### Chỉ sửa 1 file
| File | Thay đổi |
|------|----------|
| `src/components/profile/WalletTransactionHistory.tsx` | Di chuyển 2 nút từ DialogTitle xuống hàng filter, cạnh date pickers |

