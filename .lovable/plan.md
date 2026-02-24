

# Phục hồi bài đăng Gift Celebration bị thiếu

## Vấn đề
Khi chạy Backfill, hệ thống chỉ tạo bản ghi `donations` và `notifications`, nhưng **KHÔNG tạo bài đăng gift_celebration** (thẻ chúc mừng màu xanh hiển thị trên Feed và trang cá nhân). Điều này khiến nhiều giao dịch cũ có trong lịch sử nhưng không hiển thị hình ảnh chúc mừng trên bảng tin.

## Giải pháp

### 1. Nâng cấp Edge Function `auto-backfill-donations`
- Sau khi tạo donations, kiểm tra thêm donations nào chưa có bài `gift_celebration` tương ứng (so khớp qua `tx_hash`)
- Tự động tạo bài `gift_celebration` cho những donation thiếu post
- Trả về thống kê chi tiết: số bài post đã tạo thêm

### 2. Cập nhật UI trong SystemTab
- Hiển thị thêm thống kê số bài gift_celebration đã được phục hồi
- Hiển thị danh sách chi tiết các giao dịch được phục hồi (người gửi, người nhận, số tiền, token)

## Chi tiết kỹ thuật

### auto-backfill-donations/index.ts - Thêm logic tạo gift_celebration posts

```text
Sau bước insert donations hiện tại, thêm:

1. Query tất cả donations có status='confirmed'
2. Query tất cả posts có post_type='gift_celebration' 
3. Tìm donations có tx_hash KHÔNG khớp với bất kỳ post gift_celebration nào
4. Lấy thông tin profile (username, display_name) của sender + recipient
5. Tạo bài post gift_celebration cho mỗi donation thiếu:
   - user_id = sender_id
   - post_type = 'gift_celebration'
   - tx_hash, gift_sender_id, gift_recipient_id, gift_token, gift_amount
   - is_highlighted = true
   - visibility = 'public', moderation_status = 'approved'
6. Trả về số posts_created trong response
```

### SystemTab.tsx - Cập nhật hiển thị kết quả

```text
Thêm dòng thống kê:
- "Bài chúc mừng đã tạo: X" 
- Danh sách chi tiết từng giao dịch được phục hồi (sender -> recipient, amount, token)
```

### Files thay đổi
1. `supabase/functions/auto-backfill-donations/index.ts` -- Thêm logic tạo gift_celebration posts cho donations thiếu
2. `src/components/admin/SystemTab.tsx` -- Hiển thị chi tiết kết quả phục hồi

