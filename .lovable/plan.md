

## Plan: Mở rộng chiều ngang dialog gấp đôi

Hiện tại dialog đang dùng `max-w-5xl` (tương đương 64rem / 1024px). Để mở rộng gấp đôi, sẽ đổi thành `max-w-[120rem]` kết hợp `w-[95vw]` để dialog chiếm gần hết chiều ngang màn hình mà vẫn có margin hai bên.

### Thay đổi
- **File**: `src/components/profile/WalletTransactionHistory.tsx`  
  - Dòng 386: Đổi `max-w-5xl` thành `max-w-[90vw]` để dialog rộng ra gần gấp đôi, tận dụng tối đa chiều ngang màn hình.

