

## Kế hoạch: Xóa 6 lệnh sai angeldieungoc → angelthanhtinh

### Nguyên nhân
Ví gửi on-chain `0xcc3e...9530` **không thuộc về angeldieungoc** (ví thật: `0x7b6c...7da8`) và cũng không thuộc bất kỳ user nào trong hệ thống. Hệ thống auto-backfill gán nhầm `sender_id` dựa trên `transactions.user_id` thay vì kiểm tra `from_address`.

### Dữ liệu cần xóa

| # | Donation ID | Token | Amount | Ngày | Tx Hash |
|---|-------------|-------|--------|------|---------|
| 1 | a6c0ac8d | CAMLY | 20,000,000 | 21/03 | 0xd1b5...1f8a |
| 2 | 8e5a1629 | USDT | 200 | 21/03 | 0x553b...a49a |
| 3 | 7208eeaf | CAMLY | 10,000,000 | 12/03 | 0x3f35...be44 |
| 4 | af16706e | USDT | 100 | 12/03 | 0x1745...fb5e |
| 5 | 2fe6c424 | CAMLY | 10,000,000 | 08/03 | 0x80d3...36be |
| 6 | 4a687dcc | USDT | 100 | 08/03 | 0xf227...5faf |

### Thực hiện (1 migration SQL duy nhất)

**Bước 1**: Xóa 6 bài post gift_celebration liên quan:
- 14d042b7, c04b6919, 6773beee, 38165f57, 2f81d251, 4182be55

**Bước 2**: Xóa notifications liên quan (tìm trong metadata chứa donation_id hoặc post_id)

**Bước 3**: Xóa 6 donations:
- a6c0ac8d, 8e5a1629, 7208eeaf, af16706e, 2fe6c424, 4a687dcc

### Không thay đổi code
Chỉ dọn dẹp dữ liệu sai. Việc vá logic edge function (chống gán nhầm sender) sẽ thực hiện trong bước tiếp theo của kế hoạch sửa chữa tổng thể.

