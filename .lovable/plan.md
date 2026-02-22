
# Mở khóa 4 tài khoản Admin/Gia đình

## Tổng quan
4 tài khoản bị đặt trạng thái `on_hold` do hệ thống phát hiện chia sẻ thiết bị (device_hash v1 trùng nhau). Người dùng xác nhận đây là các tài khoản hợp lệ (admin test, gia đình), không phải farm.

## Tài khoản cần mở khóa

| Username | Họ tên | Trạng thái hiện tại |
|---|---|---|
| angelaivan | Nguyễn Ái Vân | on_hold |
| angeldieungoc | Angel Diệu Ngọc | on_hold |
| AngelGiau | ANGEL Giàu.Treasury | on_hold |
| leminhtri | Lê Minh Trí | on_hold |

## Thực hiện

Chạy **1 migration SQL** thực hiện 3 bước:

1. **Cập nhật `profiles`**: Đổi `reward_status` từ `on_hold` sang `approved` cho cả 4 tài khoản, xóa ghi chú admin liên quan (nếu có)

2. **Giải quyết fraud signals**: Đánh dấu `is_resolved = true` cho 5 bản ghi `SHARED_DEVICE` đang mở của 4 tài khoản này trong bảng `pplp_fraud_signals`

3. **Xóa fraud flags**: Reset `fraud_flags = 0` trong `pplp_user_tiers` (nếu có bản ghi)

## Chi tiết kỹ thuật

```text
profiles.reward_status: 'on_hold' -> 'approved'  (4 users)
pplp_fraud_signals.is_resolved: false -> true     (5 records)
pplp_user_tiers.fraud_flags: -> 0                 (if exists)
```

Không thay đổi code frontend, chỉ cập nhật dữ liệu database.
