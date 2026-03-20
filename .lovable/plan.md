

## Chỉnh giao diện lịch sử giao dịch trong ví giống trang cá nhân

### Khác biệt hiện tại

**Trang cá nhân** (`WalletTransactionHistory.tsx` — DonationCard):
- Users + Số tiền (giữa) + Giờ/Ngày/Tx (phải) nằm trên **1 dòng**
- Bộ lọc + Date picker nằm trên **cùng 1 hàng** (filters trái, date picker phải với `ml-auto`)
- Danh sách giao dịch có **thanh cuộn** (`overflow-y-auto`)

**Ví** (`HistoryTab.tsx` — DonationCard):
- Users nằm 1 dòng, Số tiền + Giờ/Ngày/Tx nằm dòng riêng (2 dòng)
- Bộ lọc và Date picker tách thành **2 hàng riêng**
- Không có thanh cuộn riêng cho danh sách

### Thay đổi — `src/components/wallet/tabs/HistoryTab.tsx`

**1. DonationCard** (dòng 202-281): Thay layout hiện tại bằng layout 1 dòng giống profile:
- Row 2: `[Users (shrink)] [Amount (mx-auto, center, red)] [Time + Date + Tx (shrink-0, right)]`
- Bỏ Row 3 riêng biệt

**2. Filters + Date picker** (dòng 327-383): Gộp vào 1 hàng:
- Trái: Filter icon + buttons
- Phải (`ml-auto`): Từ ngày + Đến ngày + nút xóa

**3. Danh sách giao dịch** (dòng 398-413): Bọc trong container có `overflow-y-auto` với chiều cao cố định để có thanh cuộn

