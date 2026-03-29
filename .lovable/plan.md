
Mục tiêu: sửa triệt để để giao dịch từ ví ngoài chuyển vào ví trong fun.rich luôn được ghi nhận tự động, có thông báo, và hiển thị đúng trong lịch sử giao dịch.

1. Kết luận sau khi kiểm tra
- Với 2 tx con gửi:
  - `0xe9a2...5d77`
  - `0x55c1...eb06`
  hiện tại chưa có bản ghi trong:
  - `donations`
  - `wallet_transfers`
  - `posts`
  - `notifications`
- Ví nhận `0xa496...7DA5d` đang là hồ sơ `funtreasury`.
- `auto-scan-donations` và `scan-my-incoming` có tạo `donations/posts/notifications`, nhưng chưa ghi đồng bộ sang `wallet_transfers`.
- `HistoryTab` và `WalletTransactionHistory` hiện đang lọc bỏ `transfer` và `swap`, nên kể cả có dữ liệu thì UI vẫn có thể không hiện.
- `fast-scan-donations` vẫn quét theo token contract toàn mạng, rất dễ bỏ sót.
- `auto-scan-donations` và `scan-my-incoming` đang gọi Moralis theo từng ví nhưng chỉ lấy `limit=50/100` và không phân trang đủ sâu, nên với ví nhiều giao dịch như treasury thì lệnh cũ rất dễ bị trôi khỏi cửa sổ quét.

2. Hướng sửa backend
- Giữ scanner theo ví làm luồng chính, không phụ thuộc vào quét theo token contract cho giao dịch ví ngoài.
- Nâng `auto-scan-donations`:
  - thêm phân trang Moralis theo từng ví, không chỉ lấy 50 lệnh đầu
  - dừng quét khi gặp tx đã biết hoặc đạt ngưỡng an toàn
  - hỗ trợ tốt cho ví có lưu lượng cao như treasury
- Nâng `scan-my-incoming`:
  - dùng cùng chiến lược quét nhiều trang như auto-scan
  - để user bấm quét vẫn bắt được các lệnh vừa vào hoặc bị trôi khỏi trang đầu
- Khi phát hiện incoming transfer hợp lệ, ghi đồng thời:
  - `donations` để lên gift/feed/thông báo
  - `wallet_transfers` với `direction='in'` để lên lịch sử ví
- Deduplicate theo `tx_hash` ở cả 2 bảng để tránh trùng khi auto-scan và scan thủ công cùng bắt một giao dịch.
- Giữ logic hiện có:
  - tạo `gift_celebration`
  - tạo `notification`
  - tạo chat nếu xác định được sender nội bộ

3. Hướng sửa frontend
- Sửa `src/components/wallet/tabs/HistoryTab.tsx`:
  - bỏ lọc cứng đang loại `transfer` và `swap`
  - render đúng theo loại dữ liệu:
    - `DonationCard`
    - `TransferCard`
    - `SwapCard`
- Sửa `src/components/profile/WalletTransactionHistory.tsx` tương tự để lịch sử trong profile và trong ví hiển thị thống nhất.
- Rà lại invalidate/refetch sau khi quét để cập nhật ngay:
  - `donation-history`
  - `transaction-history`
  - `notifications`
  - dữ liệu lịch sử ví/hồ sơ

4. Backfill cho các lệnh đang bị thiếu
- Sau khi sửa scanner, thêm bước backfill có kiểm soát cho ví nhận đang bị lỗi:
  - quét sâu lại lịch sử incoming của ví treasury
  - tìm lại các tx bị bỏ sót
  - ghi đủ `donations + wallet_transfers + posts + notifications`
- Mục tiêu là không chỉ sửa cho tương lai mà còn làm hiện lại các lệnh đang thiếu.

5. File sẽ chỉnh
- `supabase/functions/auto-scan-donations/index.ts`
- `supabase/functions/scan-my-incoming/index.ts`
- `supabase/functions/fast-scan-donations/index.ts` hoặc giảm vai trò của luồng này
- `src/components/wallet/tabs/HistoryTab.tsx`
- `src/components/profile/WalletTransactionHistory.tsx`

6. Kết quả mong đợi
- Ví ngoài chuyển vào ví trong fun.rich sẽ tự lên hệ thống, không cần cập nhật tay.
- User nhận thông báo sau khi scanner bắt được giao dịch.
- Lệnh hiển thị nhất quán ở:
  - lịch sử giao dịch ví
  - lịch sử trong profile
  - gift/feed liên quan
- Các ví có nhiều giao dịch như treasury không còn bị miss vì chỉ quét trang đầu.

7. Lưu ý kỹ thuật
- Không cần sửa bảng nếu tận dụng được `wallet_transfers` hiện có.
- Nếu cần trạng thái quét bền vững theo từng ví để tối ưu hơn nữa, có thể bổ sung cơ chế lưu mốc quét theo ví trong backend thay vì chỉ dùng cursor theo lô.
- Con đang mở preview của một commit cũ, nên sau khi triển khai sẽ cần kiểm tra trên bản mới nhất để tránh nhìn nhầm hành vi cũ.
