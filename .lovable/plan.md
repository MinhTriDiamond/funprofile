

## Thu gọn bảng — giảm chiều rộng dialog và khoảng cách cột

### Thay đổi

**File: `src/components/feed/ClaimHistoryModal.tsx`**

1. **Giảm chiều rộng dialog**: Đổi `sm:!max-w-[1400px]` thành `sm:!max-w-[1050px]` — vừa đủ cho 6 cột, không quá rộng
2. **Giảm padding cell**: Đổi `p-2` thành `px-2 py-1.5` trên cả `<th>` và `<td>` — giảm khoảng cách giữa các cột
3. **Giảm font-size nhẹ**: Đổi `text-[15px]` thành `text-sm` (14px) trên table để nội dung gọn hơn

### Kết quả
Các cột nằm sát nhau hơn, dialog không quá rộng, bảng gọn đẹp và vẫn hiển thị đầy đủ 6 cột.

