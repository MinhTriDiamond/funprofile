
Mục tiêu: sửa dứt điểm để giao dịch ví ngoài chuyển vào vẫn hiện đúng trong lịch sử ví, profile và các màn hình liên quan.

1. Kết luận sau khi kiểm tra
- Hai tx mẫu `0xe9a2...5d77` và `0x55c1...eb06` hiện không có trong `donations` và `wallet_transfers`.
- Ví nhận `0xa496...7DA5d` đúng là hồ sơ `funtreasury`.
- Hồ sơ này đang có `2` bản ghi trong `donations` nhưng `0` bản ghi trong `wallet_transfers`, nên UI lịch sử ví sẽ thiếu dữ liệu transfer.
- `WalletTransactionHistory` đã render được `TransferCard` và `SwapCard`, nhưng `HistoryTab` vẫn đang render mọi item bằng `DonationCard`, nên tab lịch sử trong ví vẫn có thể không hiện đúng loại giao dịch.
- `scan-my-incoming` và `auto-scan-donations` có logic ghi `wallet_transfers`, nhưng dữ liệu thực tế của treasury cho thấy phần đồng bộ này chưa backfill được các lệnh cũ bị miss.
- `fast-scan-donations` vẫn là nguồn dễ bỏ sót vì quét theo token contract, không phù hợp cho ví bận như treasury.

2. Hướng sửa backend
- Chuẩn hóa `scan-my-incoming` và `auto-scan-donations` theo một luồng chung:
  - luôn ghi đồng thời `donations` và `wallet_transfers`
  - dedupe theo `tx_hash` ở cả hai bảng
  - tiếp tục tạo `posts`, `notifications`, và chat cho giao dịch nội bộ
- Tăng độ chắc chắn của quét theo ví:
  - quét sâu nhiều trang hơn cho ví treasury / ví nhiều giao dịch
  - dừng khi gặp tx đã biết hoặc đạt ngưỡng an toàn
- Giảm phụ thuộc vào `fast-scan-donations` cho incoming external transfer, chỉ giữ như lớp bổ trợ nếu cần.

3. Backfill dữ liệu bị thiếu
- Thêm hoặc dùng lại luồng backfill theo ví để quét lại riêng cho `funtreasury`.
- Mục tiêu backfill:
  - chèn lại các tx bị miss vào `donations`
  - chèn bổ sung `wallet_transfers` còn thiếu
  - tạo đủ `gift_celebration`, `notifications`
- Ưu tiên bảo đảm 2 tx mẫu xuất hiện sau backfill.

4. Hướng sửa frontend
- Sửa `src/components/wallet/tabs/HistoryTab.tsx`:
  - render theo `d.type`
  - `transfer` → `TransferCard`
  - `swap` → `SwapCard`
  - `donation` → `DonationCard`
- Rà lại `src/components/profile/WalletTransactionHistory.tsx` để giữ cách hiển thị thống nhất với tab trong ví.
- Đảm bảo sau khi bấm quét, các query lịch sử được làm mới đầy đủ:
  - `donation-history`
  - `transaction-history`
  - `wallet-transfers`
  - `notifications`
  - dữ liệu profile history nếu có cache riêng

5. File sẽ chỉnh
- `supabase/functions/scan-my-incoming/index.ts`
- `supabase/functions/auto-scan-donations/index.ts`
- `supabase/functions/fast-scan-donations/index.ts` (giảm vai trò hoặc chỉnh fallback)
- `src/components/wallet/tabs/HistoryTab.tsx`
- `src/components/profile/WalletTransactionHistory.tsx`
- nếu cần: luồng backfill liên quan `wallet_transfers`

6. Kết quả mong đợi
- Ví ngoài chuyển vào ví trong fun.rich được tự ghi nhận ổn định.
- Treasury và các ví nhiều giao dịch không còn bị miss vì chỉ quét nông.
- Giao dịch xuất hiện nhất quán ở:
  - lịch sử ví
  - lịch sử trên profile
  - feed / gift liên quan
- User nhận thông báo ngay khi hệ thống bắt được giao dịch.
