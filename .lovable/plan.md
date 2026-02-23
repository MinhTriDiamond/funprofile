

# Tự Động Đình Chỉ Tài Khoản Khi Phát Hiện Gian Lận

## Giải thích cảnh báo

Thông báo "Báo cáo gian lận: 7 cảnh báo" là kết quả từ hệ thống quét gian lận tự động hàng ngày. Hệ thống phát hiện:

- **Thiết bị dùng chung**: Cùng 1 thiết bị (mã dfb4ace9...) đăng nhập 3 tài khoản khác nhau -- dấu hiệu multi-account
- **Cụm email "tacongminh"**: 3 email chỉ khác nhau phần số cuối (ví dụ: tacongminh1@, tacongminh2@, tacongminh3@)
- **Cụm email "congminhyvnh"**: 18 email cùng gốc -- đây là dấu hiệu email farm rất rõ ràng

## Vấn đề hiện tại

Hệ thống quét hàng ngày (`daily-fraud-scan`) **chỉ gửi cảnh báo** cho admin nhưng **KHÔNG tự động đình chỉ** các tài khoản bị gắn cờ. Trong khi đó, các hệ thống khác (đăng nhập IP đen, rút thưởng) thì đã tự động đặt `reward_status = 'on_hold'`.

## Giải pháp

Cập nhật edge function `daily-fraud-scan` để tự động đình chỉ (on_hold) các tài khoản bị phát hiện, với ngoại lệ cho admin.

### Luồng xử lý mới

1. Khi phát hiện thiết bị dùng chung (>2 users): Tự động `on_hold` tất cả user liên quan
2. Khi phát hiện cụm email farm (>=3 accounts): Tự động `on_hold` tất cả user trong cụm
3. Khi phát hiện IP cluster (>3 accounts): Tự động `on_hold` tất cả user liên quan
4. **Ngoại lệ**: Bỏ qua các tài khoản admin (có role admin trong bảng `user_roles`) và tài khoản đã bị ban

### Chi tiết kỹ thuật

**File sửa: `supabase/functions/daily-fraud-scan/index.ts`**

Thêm logic sau mỗi bước phát hiện gian lận:

```text
1. Lấy danh sách admin IDs từ bảng user_roles (1 lần đầu function)
2. Sau khi phát hiện shared device:
   - Lọc bỏ admin khỏi danh sách users
   - UPDATE profiles SET reward_status = 'on_hold', admin_notes = '...' 
     WHERE id IN (user_ids) AND reward_status NOT IN ('banned', 'on_hold')
3. Sau khi phát hiện email farm:
   - Tương tự, on_hold tất cả user trong cụm (trừ admin)
4. Sau khi phát hiện IP cluster:
   - Tương tự, on_hold tất cả user liên quan (trừ admin)
5. Thông báo admin ghi rõ số tài khoản đã bị đình chỉ
```

Ghi chú admin_notes sẽ ghi rõ lý do cụ thể, ví dụ:
- "Thiết bị dfb4ace9 dùng chung 3 tài khoản. Tự động đình chỉ bởi hệ thống quét hàng ngày."
- "Email farm: cụm congminhyvnh có 18 tài khoản. Tự động đình chỉ."

