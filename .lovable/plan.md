

# Backfill bài viết chúc mừng cho 2 giao dịch BTC và CAMLY

## Vấn đề

2 giao dịch từ `funtreasury` → `angelquan` đã được ghi nhận trong bảng `donations` nhưng **thiếu bài viết `gift_celebration`** trong bảng `posts`, nên không hiển thị trên trang chủ.

| Giao dịch | Token | Số lượng | TX Hash |
|-----------|-------|----------|---------|
| 1 | BTC | 0.02620 | `b770da...66ac` |
| 2 | CAMLY | 13,836,000 | `0xe083...e6d1` |

## Giải pháp

Chạy SQL INSERT 2 bài viết `gift_celebration` vào bảng `posts`:

```sql
-- Post 1: BTC 0.02620
INSERT INTO posts (user_id, content, post_type, tx_hash, 
  gift_sender_id, gift_recipient_id, gift_token, gift_amount, gift_message,
  is_highlighted, highlight_expires_at, visibility, moderation_status, created_at)
VALUES (
  '733a0ca6-91e2-4513-a1a0-ce34fea484f8',
  '🎉 @funtreasury đã trao gửi 0.02620 BTC cho @angelquan ❤️
"CHÚC MỪNG BÉ ANGEL MINH QUÂN..."',
  'gift_celebration',
  'b770dae78d5d46d39f04b0c8021e51ca4330160da6e572097dffbe1d386166ac',
  '733a0ca6-91e2-4513-a1a0-ce34fea484f8',
  'e16a7fa8-0c38-41b1-a7a8-fad1269ced78',
  'BTC', '0.02620', '<message>', true,
  NOW() + interval '24 hours', 'public', 'approved',
  '2026-04-04 18:09:51+00'
);

-- Post 2: CAMLY 13,836,000
-- Tương tự với token_symbol = 'CAMLY', amount = '13836000'
```

## Kết quả mong đợi

- 2 bài viết chúc mừng xuất hiện trên trang chủ (feed)
- Hiển thị giống hình 3 và hình 4 mà con đã gửi
- Đồng tiền BTC nhảy múa 2x, CAMLY kích thước tiêu chuẩn

