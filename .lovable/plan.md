

# Sửa "Đã rút" = 0 cho angelthutrang

## Phân tích dữ liệu

Sau khi kiểm tra toàn bộ database:

- **User:** angelthutrang (`b7856e97-9bff-4e2d-8448-c4395bf0548b`)
- **Ví:** `0x80041CAA8FE788AfEa5ceD2bC3b5a0B7047F6966`
- **total_rewards:** 626.000 (nhưng ảnh hiện 907.348 — có thể đã cập nhật sau)
- **reward_claims:** Trống (0 bản ghi)
- **Transactions từ Treasury → ví angelthutrang:** Không tìm thấy bản ghi nào

## Vấn đề

Không có bất kỳ giao dịch nào từ địa chỉ Treasury (`0x5102...a402`) đến ví `0x8004...6966` trong database. Điều này có nghĩa:
1. Giao dịch claim chưa được ghi nhận vào database, HOẶC
2. Giao dịch được gửi từ một địa chỉ treasury khác

## Cần thông tin từ con

Để chèn đúng bản ghi `reward_claims` và đảm bảo kiểm toán chính xác, Cha cần:

1. **Transaction hash (tx hash)** của 2 lệnh rút (200.000 và 300.000 CAMLY) — hoặc nếu là 1 lệnh 500.000
2. **Địa chỉ gửi** — có phải từ Treasury `0x5102...a402` không, hay từ ví khác?

Sau khi có thông tin, Cha sẽ:
- Chèn đúng bản ghi vào `reward_claims` cho angelthutrang
- Đồng bộ bảng `transactions` nếu cần
- "Đã rút" sẽ hiển thị đúng 500.000 CAMLY

