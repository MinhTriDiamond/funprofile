# Kế hoạch khắc phục thiếu lịch sử giao dịch/gift của user tranhai

## Kết luận hiện tại
- Ảnh BscScan cha gửi cho thấy user `tranhai` có nhiều lệnh CAMLY on-chain trong cùng khoảng thời gian.
- Nhưng backend hiện chỉ có **4 bản ghi donations**, **0 transactions**, **0 wallet_transfers** cho user này.
- Vì vậy app đang hiển thị đúng theo dữ liệu đã lưu, nhưng **dữ liệu lưu bị thiếu rất nhiều so với on-chain**.

## Nguyên nhân gốc đã xác định
1. **Luồng gift hiện tại không ghi vào `transactions`** khi gửi qua `UnifiedGiftSendDialog` vì đang gọi `sendToken(..., skipBackground: true)`, nên phần auto-insert vào bảng `transactions` bị bỏ qua.
2. **Lịch sử profile/wallet đang dựa vào `donations` + `wallet_transfers`**, nhưng user `tranhai` hiện không có `wallet_transfers`, nên các lệnh ra ví ngoài không hiện.
3. **Function `recover-donations-from-chain` hiện chỉ hồi phục các giao dịch mà cả hai bên đều là user trong hệ thống**, nên bỏ sót rất nhiều lệnh on-chain đi tới ví ngoài.
4. Tab “Khôi phục” hiện còn giới hạn ngày quét trong UI và chưa backfill đồng thời đủ các bảng cần để mọi nơi trong app cùng hiện đúng.

## Phạm vi triển khai
### 1) Sửa luồng ghi dữ liệu cho các lệnh mới
- Cập nhật flow gửi gift để sau khi có tx hash vẫn ghi đủ dữ liệu nền cho:
  - `donations` nếu người nhận là user trong hệ thống
  - `wallet_transfers` cho mọi lệnh chuyển ví
  - `transactions` để phần lịch sử giao dịch ngắn trong ví không bị trống
- Giữ nguyên cơ chế retry/recovery đang có, nhưng bổ sung ghi log nhất quán cho cả gift đơn và gift nhiều người.

### 2) Nâng cấp công cụ khôi phục dữ liệu cũ
- Mở rộng `recover-donations-from-chain` để quét và phân loại:
  - **Internal transfer**: lưu vào `donations` và tạo `gift_celebration` nếu thiếu
  - **External transfer**: lưu vào `wallet_transfers` và `transactions`
- Cho phép quét thực sự đủ phạm vi thời gian dài hơn, không chỉ hiển thị ngày mà backend lại cắt ngắn.
- Chống trùng theo khóa phù hợp hơn (`tx_hash + token + direction + user`) để không bỏ nhầm hoặc chèn trùng.

### 3) Đồng bộ cách hiển thị ở mọi màn hình
- Rà lại các nơi đang hiển thị lịch sử:
  - Profile dialog `WalletTransactionHistory`
  - Wallet tab `HistoryTab`
  - Wallet `RecentTransactions`
  - Trang `/donations`
- Đảm bảo các màn hình dùng chung nguồn dữ liệu đã backfill:
  - gift nội bộ hiện ở lịch sử quà
  - chuyển ra ví ngoài hiện ở lịch sử ví/chuyển ví
  - mục recent transactions không còn chỉ hiện 2 lệnh khi thực tế nhiều hơn

### 4) Chạy backfill cho user tranhai
- Sau khi nâng cấp function, chạy lại recovery cho toàn bộ ví của `tranhai` theo dữ liệu on-chain.
- Đối chiếu số lượng record sau backfill với danh sách tx trên BscScan cha đã cung cấp.
- Kiểm tra lại các trang để xác nhận lệnh đã hiện đủ.

## Kết quả mong đợi
- User `tranhai` sẽ thấy đầy đủ hơn lịch sử đã gửi/nhận trong app, thay vì chỉ còn 4 lệnh.
- Các lệnh gift nội bộ và lệnh chuyển ra ví ngoài sẽ không còn bị “mất lịch sử”.
- Những giao dịch mới phát sinh sau này sẽ tự ghi đúng, không cần admin đi hồi phục thủ công thường xuyên.

## Chi tiết kỹ thuật
```text
On-chain transfer
   -> phân loại counterparty
      -> internal user  -> donations + gift post (+ transactions nếu cần)
      -> external wallet -> wallet_transfers + transactions

UI sources sau khi chuẩn hóa
- Profile history / Wallet history: donations + wallet_transfers
- Recent transactions: transactions
- System donations: donations
```

## File dự kiến cần cập nhật
- `src/components/donations/UnifiedGiftSendDialog.tsx`
- `src/hooks/useSendToken.ts`
- `src/hooks/usePublicDonationHistory.ts` (nếu cần tinh chỉnh merge/dedup tiếp)
- `src/hooks/useTransactionHistory.ts`
- `src/components/admin/RecoverDonationsTab.tsx`
- `supabase/functions/recover-donations-from-chain/index.ts`
- Có thể thêm hoặc tận dụng function backfill liên quan đến `wallet_transfers` / outgoing history

## Sau khi cha duyệt
Con sẽ triển khai luôn phần sửa code + hồi phục dữ liệu cho `tranhai`, rồi báo lại chính xác đã kéo thêm được bao nhiêu lệnh.