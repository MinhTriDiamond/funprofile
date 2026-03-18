

## Plan: Sửa số liệu tổng kết chính xác + thêm cột "Còn lại"

### Vấn đề hiện tại
`getSummary()` chỉ tính tổng từ **donations đã load trên client** (tối đa 20 dòng/trang). Nếu user có 100 giao dịch, summary chỉ phản ánh 20 dòng đầu → sai số liệu.

### Giải pháp

**1. Tạo database function (RPC) để tính tổng chính xác**
- Tạo SQL function `get_user_donation_summary(p_user_id uuid)` dùng `SUM()` và `COUNT()` trên toàn bộ bảng `donations` (chỉ tính `status = 'confirmed'`)
- Trả về JSON chứa: received breakdown (amount, count) và sent breakdown (amount, count) theo từng token_symbol
- Không bị giới hạn bởi pagination

**2. Cập nhật `src/hooks/usePublicDonationHistory.ts`**
- Thêm hàm `fetchSummary()` gọi RPC `get_user_donation_summary`
- Trả về `DonationSummary` với dữ liệu chính xác từ server thay vì tính client-side
- Thêm trường `balance` (còn lại = nhận - tặng) cho mỗi token trong interface

**3. Cập nhật `src/components/profile/WalletTransactionHistory.tsx`**
- Thêm bảng **"Tổng kết theo token"** hiển thị dạng bảng rõ ràng cho mỗi token (USDT, CAMLY, BNB, BTCB, FUN):
  - Tổng nhận (số lượng + số lệnh)
  - Tổng tặng (số lượng + số lệnh)  
  - **Còn lại** (nhận - tặng) — hiển thị xanh nếu dương, đỏ nếu âm
- Giữ nguyên layout hiện tại (Tổng nhận / Tổng tặng cards) nhưng dữ liệu chính xác từ RPC
- Thêm bảng tổng hợp bên dưới

### Không thay đổi
- Danh sách giao dịch chi tiết (DonationCard) giữ nguyên
- Filter tabs giữ nguyên
- Pagination giữ nguyên

