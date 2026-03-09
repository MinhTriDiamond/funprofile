

## Sửa giao diện mobile hiển thị lịch sử giao dịch giống desktop

### Vấn đề
Trên mobile, `SystemDonationHistory.tsx` dùng layout khác desktop: chỉ hiện avatar sender + dòng nhỏ "→ @recipient", không thấy rõ avatar và tên người nhận. Desktop thì hiện đầy đủ cả hai bên Sender → Recipient với avatar.

Screenshot của user xác nhận: mobile chỉ thấy 1 avatar sender bên trái, recipient bị gom vào text nhỏ.

### Giải pháp
Thay thế mobile list (lines 549-640+) bằng **cùng layout card** như desktop (lines 433-547), chỉ điều chỉnh nhỏ cho vừa màn hình nhỏ:

| File | Thay đổi |
|---|---|
| `src/components/donations/SystemDonationHistory.tsx` | Xóa `hidden md:block` trên desktop cards, xóa hoàn toàn mobile list riêng. Dùng chung 1 layout card cho cả mobile và desktop, với responsive classes cho font-size/spacing |

### Chi tiết
- Bỏ `hidden md:block` trên desktop card container (line 433)
- Xóa toàn bộ mobile list `md:hidden divide-y` (lines 550-640+)
- Điều chỉnh card: amount font `text-xl md:text-xl` → `text-lg sm:text-xl`, username `max-w-[100px] sm:max-w-none`
- Giữ nguyên layout Sender → Recipient với cả 2 avatar, chỉ thu nhỏ gap/padding trên mobile

