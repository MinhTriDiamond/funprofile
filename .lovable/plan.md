

# Công cụ kiểm tra và phục hồi giao dịch toàn diện

## Tổng quan
Thêm 3 tính năng mới vào trang Admin (SystemTab) để kiểm tra và phục hồi giao dịch bị thiếu:
1. Tìm theo TX Hash
2. Xem toàn bộ transactions
3. Thêm giao dịch thủ công

---

## 1. Tìm theo TX Hash

Thêm ô nhập TX Hash vào SystemTab. Khi nhập, hệ thống sẽ truy vấn 3 bảng:
- `transactions` -- giao dịch gốc
- `donations` -- bản ghi donation  
- `posts` (post_type = 'gift_celebration') -- bài chúc mừng

Hiển thị kết quả dạng checklist:
- Có trong transactions? (trạng thái, thời gian)
- Có trong donations? (người gửi, người nhận, số tiền)
- Có bài gift_celebration? (link đến bài viết)

**Thực hiện:** Tạo edge function mới `check-transaction` nhận `tx_hash`, trả về trạng thái từ cả 3 bảng.

## 2. Xem toàn bộ bảng transactions

Thêm tab/section mới hiển thị toàn bộ dữ liệu từ bảng `transactions` (không chỉ những cái thiếu). Bao gồm:
- Bảng phân trang với cột: Người gửi, Địa chỉ đích, Số tiền, Token, TX Hash, Trạng thái, Thời gian
- Đánh dấu trực quan: dòng nào đã có donation (xanh), dòng nào thiếu (đỏ)
- Bộ lọc: status, token

**Thực hiện:** Tạo edge function `list-all-transactions` trả về transactions kèm flag `has_donation` và `has_post`.

## 3. Thêm giao dịch thủ công

Form cho admin nhập:
- TX Hash (bắt buộc)
- Người gửi (chọn từ danh sách user hoặc nhập wallet address)
- Người nhận (chọn từ danh sách user)
- Số tiền + Token
- Tin nhắn (tùy chọn)

Khi submit: Tạo bản ghi trong `donations` + `posts` (gift_celebration) + `notifications`.

**Thực hiện:** Tạo edge function `manual-create-donation` xử lý logic tạo đầy đủ 3 bản ghi.

---

## Chi tiết kỹ thuật

### Edge Functions mới

**1. `supabase/functions/check-transaction/index.ts`**
- Input: `{ tx_hash: string }`
- Logic: Query `transactions`, `donations`, `posts` bằng tx_hash
- Output: `{ in_transactions, in_donations, in_posts, details }`

**2. `supabase/functions/list-all-transactions/index.ts`**
- Input: `{ page, limit, status_filter, token_filter }`
- Logic: Query `transactions` + left join check donations/posts
- Output: `{ transactions[], total_count }`

**3. `supabase/functions/manual-create-donation/index.ts`**
- Input: `{ tx_hash, sender_id, recipient_id, amount, token_symbol, message }`
- Logic: Insert vào `donations` + `posts` + `notifications`
- Output: `{ success, donation_id, post_id }`

### File UI cần sửa

**`src/components/admin/SystemTab.tsx`**
- Thêm section "Tra cứu giao dịch" với ô nhập TX Hash + kết quả
- Thêm section "Toàn bộ Transactions" với bảng phân trang
- Thêm section "Thêm giao dịch thủ công" với form nhập liệu

### Files thay đổi
1. `supabase/functions/check-transaction/index.ts` -- MỚI
2. `supabase/functions/list-all-transactions/index.ts` -- MỚI
3. `supabase/functions/manual-create-donation/index.ts` -- MỚI
4. `src/components/admin/SystemTab.tsx` -- Cập nhật thêm 3 section mới

