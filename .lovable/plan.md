

## Kế hoạch: Sửa UserBreakdown để nhấp vào user lọc giao dịch + cố định phần thống kê khi cuộn

### Vấn đề
1. Khi nhấp vào user trong phần "Thống kê theo người dùng", avatar/tên bắt sự kiện click và chuyển trang thay vì lọc giao dịch. Nút lọc không rõ ràng.
2. Phần SummaryTable và UserBreakdown nằm trong vùng cuộn, khi kéo xuống xem giao dịch thì bị trôi mất.

### Thay đổi

**File: `src/components/profile/WalletTransactionHistory.tsx`**

1. **Sửa `UserBreakdownSection`**: Trong mỗi user card, thêm nút "Xem chi tiết" rõ ràng (hoặc icon mắt/filter). Khi nhấp vào **bất kỳ đâu trên card** → lọc giao dịch (đã đúng logic `onClick`). Chỉ khi nhấp vào **avatar nhỏ** mới chuyển trang profile. Thêm visual feedback rõ hơn — khi user đang được chọn, hiện "đang xem" và highlight mạnh hơn.

2. **Cố định phần thống kê (sticky)**: Di chuyển `UserBreakdownSection` và badge lọc user từ vùng cuộn (`flex-1 overflow-y-auto`, dòng 755) lên vùng cố định (`flex-shrink-0`, dòng 634). Cụ thể:
   - Di chuyển `UserBreakdownSection` (dòng 757-761) lên ngay sau `SummaryTable` (dòng 751), bên trong div `flex-shrink-0`
   - Di chuyển badge "Đang lọc" (dòng 764-778) lên cùng vị trí
   - Giới hạn `max-h` của UserBreakdown để không chiếm quá nhiều không gian cố định

### Kết quả
- Nhấp vào card user → lọc giao dịch ngay, không chuyển trang
- Avatar vẫn có thể bấm để xem profile (stopPropagation đã có)
- Phần thống kê + bảng tổng hợp luôn cố định trên đầu khi cuộn danh sách giao dịch

