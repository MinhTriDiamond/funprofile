
Mình đã rà soát và chốt được nguyên nhân chính như sau:

1. Dữ liệu BTC từ ví ngoài hiện chưa được ghi vào hệ thống đúng cách:
- Trong database đang có các lệnh BTC nội bộ giữa user Fun.Rich.
- Nhưng chưa có bản ghi nào từ ví ngoài `bc1p9pz...` vào 2 ví nhận mà con đưa.
- `wallet_transfers` cho các lệnh BTC đó cũng đang trống.

2. Lỗi không nằm chủ yếu ở phần “đọc dữ liệu”, mà nằm ở phần “quét + ghi nhận dữ liệu”:
- Giao diện `/wallet/history` đang dùng `HistoryTab.tsx`.
- Nút quét BTC hiện lại nằm trong `DonationHistoryTab.tsx` cũ, không phải màn hình lịch sử ví đang dùng.
- Vì vậy người dùng ở trang Ví gần như không kích hoạt đúng luồng quét BTC.

3. Trong `scan-btc-transactions` vẫn còn một lỗi quan trọng với giao dịch 1 TX gửi cho nhiều người nhận:
- Function đang kiểm tra trùng theo `tx_hash` quá sớm.
- Nếu 1 giao dịch đã ghi cho người nhận A, khi quét đến người nhận B cùng `tx_hash` sẽ bị bỏ qua.
- Đây là lý do rất phù hợp với tình huống “ví 1 gửi sang ví 2 và ví 3 nhưng không hiện đủ”.

4. Bảng `wallet_transfers` cũng đang có ràng buộc chưa đúng cho lịch sử nhiều user:
- Unique hiện tại là theo `tx_hash + direction + token_symbol`.
- Điều này chặn việc lưu cùng 1 giao dịch cho nhiều user khác nhau.
- Kết quả là lịch sử ví vẫn thiếu dù donation có thể đã ghi được.

5. Phần hiển thị hiện tại cũng chưa minh bạch đủ:
- BTC chỉ hiện rõ ở chế độ mạng Bitcoin.
- Nếu user đang ở chế độ EVM, lệnh BTC có thể bị “ẩn” khiến tưởng là chưa có giao dịch.

Kế hoạch cập nhật:

1. Sửa tận gốc BTC scanner
- Cập nhật `supabase/functions/scan-btc-transactions/index.ts`.
- Đổi logic chống trùng từ `tx_hash` sang khóa ghép theo từng người nhận, ví dụ `tx_hash + recipient_id`.
- Gom output theo từng recipient trong cùng 1 transaction để không mất dữ liệu khi 1 TX có nhiều output.
- Sửa luôn dedup cho `posts`, `notifications`, và chat theo từng người nhận, không chỉ theo `tx_hash`.

2. Sửa cấu trúc lưu lịch sử ví
- Tạo migration để sửa unique của `wallet_transfers` theo hướng gắn với `user_id`.
- Mục tiêu: cùng 1 `tx_hash` có thể xuất hiện hợp lệ trong lịch sử của nhiều tài khoản nhận khác nhau.
- Nếu cần, thêm ràng buộc an toàn tương tự cho `donations` để tránh vừa mất dữ liệu vừa bị trùng.

3. Đưa nút quét vào đúng màn hình người dùng đang dùng
- Thêm hành động quét BTC trực tiếp vào `src/components/wallet/tabs/HistoryTab.tsx`.
- Sau khi quét xong sẽ refetch lại:
  - lịch sử donation,
  - lịch sử wallet transfer,
  - danh sách on-chain BTC,
  - bảng tổng hợp summary.
- Không chỉ invalidate query chung, vì `HistoryTab` hiện đang dùng state nội bộ nên chỉ invalidate là chưa đủ.

4. Bổ sung đồng bộ tự động nền
- Cập nhật `supabase/functions/auto-scan-donations/index.ts` để gọi thêm BTC scan.
- Như vậy giao dịch từ ví ngoài sẽ tự vào hệ thống ngay cả khi user không bấm quét tay.
- Mục tiêu là đồng bộ trên cả máy tính và điện thoại.

5. Làm rõ phần hiển thị để user không bị nhầm là “mất giao dịch”
- Trong `HistoryTab`, thêm hiển thị rõ:
  - `Ví ngoài`,
  - `On-chain`,
  - `Đã lưu hệ thống`.
- Nếu đang ở mạng EVM, thêm gợi ý/chuyển nhanh sang lịch sử Bitcoin để không bị ẩn lệnh BTC.
- Giữ link Mempool cho BTC để đối soát minh bạch.

6. Kiểm tra lại bằng đúng case của con
- Quét lại với 3 địa chỉ:
  - ví ngoài gửi: `bc1p9pz98xkgupcpwrkt73tjufgk7ludq0e2334cvhrgc5v4exx67fhsd3d6mn`
  - ví nhận 2: `bc1qej50xw7ax2unfp6lpjc0k65nj38fy7ymx0gfc7`
  - ví nhận 3: `bc1qdl98hf5smjdusy733se99y97djgdqqy74c6ltq`
- Xác nhận dữ liệu xuất hiện đủ ở:
  - lịch sử ví,
  - trang giao dịch hệ thống,
  - donation records,
  - wallet transfers,
  - bài chúc mừng và thông báo.

Chi tiết kỹ thuật sẽ sửa:
- `supabase/functions/scan-btc-transactions/index.ts`
- `supabase/functions/auto-scan-donations/index.ts`
- `src/components/wallet/tabs/HistoryTab.tsx`
- `src/hooks/usePublicDonationHistory.ts`
- migration cho `wallet_transfers` và có thể thêm index/ràng buộc an toàn cho `donations`

Kết luận ngắn:
- Hiện tại vấn đề là thật, và lỗi chính nằm ở luồng ghi nhận BTC từ ví ngoài + dedup nhiều người nhận + lịch sử ví chưa được nối đúng với nút quét.
- Sau khi sửa theo kế hoạch trên, các lệnh từ ví ngoài vào tài khoản Fun.Rich sẽ hiện đồng bộ, rõ ràng, và lưu được ổn định trên các trang lịch sử.
