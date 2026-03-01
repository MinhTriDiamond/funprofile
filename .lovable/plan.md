

# Dọn dẹp dữ liệu FUN contract cũ (trước 14/02/2026)

## Vấn đề

Trước ngày 14/02, hệ thống đã chạy batch test tạo 102 mint requests cho nhiều user. Các records này:
- Không đi qua quy trình multisig 3-of-3 đúng cách
- Nhiều records bị stuck ở trạng thái `pending_sig`, `rejected`, `failed`, `legacy_signed`
- Một số `confirmed` nhưng với số lượng FUN không khớp on-chain
- Gây hiển thị sai lịch sử mint và số FUN cho user (ví dụ AngelKhaNhi thấy 6,774 FUN confirmed nhưng on-chain chỉ có 1,510 locked)

## Giải pháp

Thực hiện 2 bước dọn dẹp database:

### Bước 1: Giải phóng light_actions bị gắn với request cũ

735 light_actions đang trỏ `mint_request_id` đến các request cũ. Cần reset về `NULL` để các actions này có thể được mint lại trong tương lai.

```sql
UPDATE light_actions
SET mint_request_id = NULL
WHERE mint_request_id IN (
  SELECT id FROM pplp_mint_requests WHERE created_at < '2026-02-14T00:00:00Z'
);
```

### Bước 2: Xóa toàn bộ mint requests cũ

Xóa 102 records trước ngày 14/02 — bao gồm tất cả trạng thái: pending_sig, rejected, failed, confirmed, legacy_signed.

```sql
DELETE FROM pplp_mint_requests
WHERE created_at < '2026-02-14T00:00:00Z';
```

## Kết quả mong đợi

- **AngelKhaNhi**: Chỉ còn 1 request hợp lệ (1,459 FUN, signed, chờ submit). Record 6,774 FUN sai sẽ bị xóa.
- **Tất cả user**: Không còn hiển thị lịch sử mint từ batch test cũ.
- **735 light_actions**: Được giải phóng, user có thể mint lại bình thường.
- **On-chain balance**: Không bị ảnh hưởng (dữ liệu on-chain vẫn đọc trực tiếp từ contract).
- Không cần thay đổi code — chỉ dọn dẹp dữ liệu database.

