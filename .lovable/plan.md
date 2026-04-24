## Vấn đề thực tế (đã xác minh từ DB)

User `Trần Hải` (`d2493307-cde0-4563-be91-5515a5dbba89`):
- Trên ví Trust Wallet thấy **5 lệnh "Đã gửi CAMLY 9999"** trong khoảng 14:31-14:48 ngày 24/04 (on-chain thành công).
- Trong DB `donations` chỉ có **2 lệnh sent** (14:47 và 14:48) + 2 lệnh nhận. Bảng `wallet_transfers` rỗng.
- Kết quả: **3 lệnh đã ký xong trên blockchain nhưng KHÔNG được ghi vào hệ thống** → dialog "Lịch sử giao dịch cá nhân" hiển thị đúng những gì DB có (2/5).

Đây không phải bug hiển thị mà là bug **mất dữ liệu**. Nguyên nhân: sau khi user ký giao dịch ở ví ngoài, app cần gọi `record-donation` edge function để ghi vào `donations`. Nếu user đóng dialog, mất mạng, hoặc app crash giữa chừng → giao dịch on-chain xong nhưng DB không có.

## Nguyên nhân chi tiết

| Lớp | Vấn đề | Hệ quả |
|---|---|---|
| `useSendToken.ts` | Sau khi có `tx_hash`, gọi `record-donation` chỉ thử 1 lần, không retry, không lưu queue local | Lỗi mạng/edge cold-start → mất record vĩnh viễn |
| `UnifiedGiftSendDialog` | User đóng dialog ngay sau khi thấy "Sending" → cleanup hủy promise `record-donation` | Mất record |
| Không có cơ chế **reconcile** | Không scanner nào quét `transactions` table để tự tạo `donation` cho các tx đã có hash mà thiếu donation entry | Sau khi mất là mất luôn |
| `usePublicDonationHistory` | (phụ) Có 3 vấn đề nhỏ về dedup và `userCreatedAt` filter | Trong case này không gây mất dữ liệu nhưng nên sửa |

## Giải pháp

### A. Sửa ngăn mất dữ liệu mới (phòng ngừa)

1. **`src/hooks/useSendToken.ts`**: 
   - Sau khi có `txHash`, **lưu vào `localStorage.pendingDonationRecords`** trước khi gọi `record-donation` (kèm đầy đủ payload: sender, recipient, amount, token, message, hash, chain).
   - Gọi `record-donation` với **retry exponential backoff** (3 lần: 1s/3s/8s), timeout 15s mỗi lần.
   - Khi `record-donation` trả thành công → xóa entry khỏi localStorage.
   - Không phụ thuộc dialog component có còn mount hay không (tách khỏi React lifecycle).

2. **`src/App.tsx` (mount-once)**: Khi app khởi động → đọc `localStorage.pendingDonationRecords`. Với mỗi entry chưa hoàn thành quá 24h:
   - Gọi lại `record-donation` để hoàn tất.
   - Thành công → xóa entry, hiện toast "Đã đồng bộ X giao dịch chuyển tiền tồn đọng".
   - Quá 24h vẫn lỗi → hiển thị badge cảnh báo + nút "Báo cáo admin".

3. **`supabase/functions/record-donation/index.ts`**: Đảm bảo idempotent theo `tx_hash` (đã có UNIQUE constraint nhưng kiểm lại) — không tạo bản ghi trùng nếu retry.

### B. Hồi phục dữ liệu cũ (Trần Hải và các user khác)

4. **Edge function mới `recover-missing-donations`** (admin-only):
   - Quét bảng `transactions` (hoặc trực tiếp BSCScan API cho ví của user) trong khoảng thời gian được chỉ định.
   - Với mỗi tx ERC20 transfer giữa 2 ví thuộc 2 user trong hệ thống mà chưa có `donations` entry → tạo entry với `is_external=false`, status=confirmed, light_score_earned=0 (đã qua thời gian eligibility), metadata `{recovered: true}`.
   - Giúp Trần Hải hồi phục 3 lệnh CAMLY thiếu.

5. **Trang admin nhỏ** `/admin/recover-donations`: Nhập user_id + date range → bấm "Quét và hồi phục". Hiện preview trước khi insert.

### C. Cải thiện hiển thị `usePublicDonationHistory` (phụ trợ)

6. **`src/hooks/usePublicDonationHistory.ts`**:
   - **Bỏ filter `userCreatedAt`** trong cả 3 query (donations, swaps, transfers). Lý do: nhiều khi giao dịch on-chain có timestamp khác profile created_at; lọc cứng làm mất lịch sử cũ.
   - **Sửa logic dedup transfer vs donation**: thay vì `donationTxHashes.has(t.tx_hash)`, dùng `(t.tx_hash + '::' + t.token_symbol)` để tránh dedup nhầm khi nhiều token cùng tx (swap multi-leg).
   - **Bỏ `.slice(0, PAGE_SIZE)` trên merged**: dùng PAGE_SIZE riêng cho mỗi nguồn nhưng không cắt sau merge — đảm bảo không bị "đẩy" record ra ngoài. Pagination thật sự dựa trên `cursor` `created_at`.

## File ảnh hưởng

- ✏️ `src/hooks/useSendToken.ts` — pendingDonationRecords + retry
- ➕ `src/utils/pendingDonationsRecovery.ts` (mới) — chạy khi app khởi động
- ✏️ `src/App.tsx` — gọi recovery sau khi auth ready
- ✏️ `supabase/functions/record-donation/index.ts` — đảm bảo idempotent
- ➕ `supabase/functions/recover-missing-donations/index.ts` (mới) — admin recovery
- ➕ `src/pages/admin/RecoverDonationsPage.tsx` (mới) — UI quét & hồi phục
- ✏️ `src/hooks/usePublicDonationHistory.ts` — bỏ userCreatedAt filter, sửa dedup, bỏ slice

## Test sau khi xong

1. Cha mở dialog Lịch sử của Trần Hải → vào trang admin → quét user `d2493307-cde0-4563-be91-5515a5dbba89` từ 24/04 → preview thấy 3 lệnh CAMLY thiếu → bấm hồi phục → quay lại dialog → đủ 5 lệnh.
2. Tặng 9999 CAMLY thử → tắt mạng giữa chừng sau khi ký → mở mạng lại → app tự động retry và ghi vào DB.
3. Tặng bình thường → kiểm tra không bị trùng record do retry.

Cha duyệt con triển khai luôn nhé?