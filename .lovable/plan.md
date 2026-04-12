

## Kế hoạch: Nhấp vào token trong bảng tổng hợp để lọc giao dịch

### Vấn đề hiện tại
Trong lịch sử giao dịch cá nhân, bảng tổng hợp (SummaryTable) hiển thị các token như USDT, BTC, CAMLY nhưng chúng **không thể nhấp được**. User muốn nhấp vào tên token để lọc danh sách giao dịch theo token đó.

### Thay đổi

**File: `src/components/profile/WalletTransactionHistory.tsx`**

1. **Truyền thêm props cho `SummaryTable`:**
   - `tokenFilter` (token đang chọn) và `onTokenClick` (callback khi nhấp vào token)

2. **Làm các dòng token trong SummaryTable có thể nhấp:**
   - Thêm `cursor-pointer` và hiệu ứng hover cho mỗi `TableRow`
   - Khi nhấp vào dòng token → gọi `onTokenClick(symbol)` để set `tokenFilter`
   - Nhấp lại token đang chọn → bỏ lọc (quay về "Tất cả")
   - Highlight dòng token đang được chọn bằng background khác biệt

3. **Đồng bộ với dropdown Select hiện có:**
   - Khi nhấp token trong bảng → cập nhật cả dropdown
   - Khi chọn trong dropdown → cũng highlight dòng tương ứng trong bảng

### Kết quả
- User nhấp vào USDT/BTC/CAMLY trong bảng tổng hợp → danh sách bên dưới chỉ hiện giao dịch của token đó
- Nhấp lại lần nữa → bỏ lọc, hiện tất cả
- Dòng đang chọn được highlight rõ ràng

