
## Thêm nút "Xem Tất Cả" phía trên danh sách giao dịch

### Mô tả
Thêm một nút "Xem Tất Cả Giao Dịch FUN Profile" ngay bên dưới ô tìm kiếm và bộ lọc trong component `DonationHistoryTab`, để user có thể bấm navigate đến `/donations` mà không cần cuộn xuống cuối trang.

### Thay đổi

**File: `src/components/wallet/DonationHistoryTab.tsx`**

Thêm nút ngay sau hàng Search + Filters (sau dòng 234), trước dòng "Hiển thị X giao dịch onchain":

```tsx
{/* Nút Xem Tất Cả - phía trên */}
<div className="flex justify-center">
  <Button
    variant="outline"
    className="w-full max-w-md gap-2"
    onClick={() => navigate('/donations')}
  >
    Xem Tất Cả Giao Dịch FUN Profile
    <ArrowRight className="h-4 w-4" />
  </Button>
</div>
```

### Tóm tắt
- Chỉ sửa 1 file: `src/components/wallet/DonationHistoryTab.tsx`
- Thêm nút navigate `/donations` ngay dưới ô tìm kiếm
- Nút dưới cùng ở `HistoryTab.tsx` vẫn giữ nguyên
- Dùng lại `navigate` và `ArrowRight` đã có sẵn trong file
