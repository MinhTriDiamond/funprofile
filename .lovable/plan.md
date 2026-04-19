
## Mục tiêu
1. **Backfill 27 lệnh internal thiếu post** trong 7 ngày qua → tạo post `gift_celebration` retro để xuất hiện trong feed/lịch sử quà.
2. **Vá nguyên nhân gốc** ở `record-donation` để các lệnh mới không tiếp tục rớt post.
3. **Không động** 24 lệnh external (đúng thiết kế — scanner auto không tạo post).

## Hành động

### A. Backfill (1 lần) — Edge Function `backfill-missing-gift-posts`
Tạo function admin chạy 1 lần:
- Query: `donations` 7 ngày, `is_external=false`, `sender_id IS NOT NULL`, không có post gift_celebration.
- Với mỗi donation: insert post với:
  - `post_type='gift_celebration'`, `tx_hash`, `user_id=sender_id`, `target_user_id=recipient_id`, `content=message` (hoặc fallback "Đã trao tặng {amount} {token}").
  - **Bypass anti-spam + rate limit** (insert thẳng bằng service role, không qua `create-post`).
- Trả về số lượng posts đã tạo + danh sách tx_hash.
- Sau đó query lại để verify 0 lệnh thiếu.

### B. Vá `record-donation/index.ts` (nguyên nhân gốc)
Đọc file để xác định, dự kiến sửa:
1. **Tách post creation khỏi anti-spam check**: gift_celebration đã được excempt rate limit (theo memory) nhưng vẫn có thể bị anti-spam content check chặn → bypass cả 2 cho post type này.
2. **Insert post trực tiếp** thay vì gọi `create-post` edge nội bộ → loại bỏ network failure giữa 2 functions.
3. **Log rõ khi post fail**: thêm `console.error` với tx_hash + reason → dễ debug sau.
4. **Retry 3 lần với exponential backoff** (đã có nhưng có thể chưa đủ) — thêm fallback insert thẳng vào DB nếu sau 3 retry vẫn fail.

### C. Lịch sử ví hiển thị đầy đủ kể cả khi thiếu post
Trong UI lịch sử quà tặng (`useTransactionHistory` / `useWalletHistory`):
- Hiện tại chỉ render từ `donations` table → đã đủ.
- Nếu user không thấy: kiểm tra filter chain_id / token_symbol có loại bỏ không. Cần Cha xác nhận user nào không thấy lệnh nào để con check tiếp.

## Phạm vi
- 1 edge function mới (`backfill-missing-gift-posts`) — chạy 1 lần rồi xoá hoặc giữ làm tool admin.
- 1 file sửa (`record-donation/index.ts`) — vá nguyên nhân gốc.
- Không đụng schema/RLS.
- Không ảnh hưởng 2,295 lệnh đã hoạt động đúng (99.8%).

## Cần Cha xác nhận
1. Có chạy backfill ngay cho 27 lệnh internal không? (External 24 lệnh giữ nguyên — đúng thiết kế).
2. Nếu có user cụ thể đang không thấy lệnh nào trong lịch sử → Cha cho con username để con kiểm tra trực tiếp.
