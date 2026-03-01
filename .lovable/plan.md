
# Khắc phục request lỗi nonce cho AngelKhaNhi và kiểm tra toàn bộ hệ thống

## Nguyên nhân lỗi

Request `301cc5a1` của AngelKhaNhi đã **failed** vì:
- Database lưu `nonce = 0`, nhưng on-chain `nonces() = 1`
- AngelKhaNhi đã có 1 giao dịch `lockWithPPLP` thành công trước đó, nên nonce tăng lên 1
- Chữ ký EIP-712 được tạo với nonce=0 nhưng contract kiểm tra nonce=1 --> sai hash --> `SIGS_LOW`

## Kế hoạch thực hiện

### Bước 1: Reset request lỗi của AngelKhaNhi

Giải phóng 36 light_actions đang gắn với request failed, rồi xóa request:

```sql
-- Giải phóng 36 light_actions
UPDATE light_actions 
SET mint_request_id = NULL, mint_status = 'approved'
WHERE mint_request_id = '301cc5a1-93b3-43fe-8822-4c902b763568';

-- Xóa request failed
DELETE FROM pplp_mint_requests 
WHERE id = '301cc5a1-93b3-43fe-8822-4c902b763568';
```

### Bước 2: Tạo lại mint request với nonce đúng

Sau khi reset, chạy lại batch mint (edge function `admin-batch-mint-requests`) sẽ tự động:
- Tìm 36 light_actions vừa được giải phóng
- Gọi `nonces()` on-chain lấy nonce=1 (đúng)
- Tạo request mới với nonce=1

### Bước 3: Kiểm tra tất cả request khác

Hiện tại chỉ có **1 request failed** (của AngelKhaNhi). Các request khác đang ở `pending_sig`/`signing`/`signed` chưa bị submit nên chưa thể biết nonce có đúng không cho đến khi submit.

Tuy nhiên, edge function `admin-batch-mint-requests` **đã có logic đọc nonce on-chain** khi tạo request mới (hàm `getNonceFromContract`). Vấn đề chỉ xảy ra với request cũ đã tạo trước khi user có giao dịch on-chain.

**Giải pháp phòng ngừa**: Thêm kiểm tra nonce on-chain vào flow submit (trước khi gửi tx), nếu nonce DB khác nonce on-chain thì cảnh báo và yêu cầu tạo lại request.

### Bước 4: Cải thiện code - Thêm nonce validation trước submit

Cập nhật logic submit trong frontend (component xử lý `lockWithPPLP`):
- Trước khi gửi transaction, đọc `nonces(recipient)` từ contract
- So sánh với `nonce` trong database
- Nếu khác nhau: hiển thị cảnh báo "Nonce không khớp, cần tạo lại request" thay vì submit và bị revert

## Tóm tắt thay đổi

| Hành động | Chi tiết |
|-----------|----------|
| Reset data AngelKhaNhi | Giải phóng 36 light_actions, xóa 1 request failed |
| Tạo lại request | Chạy batch mint lấy nonce=1 đúng |
| Cải thiện code | Thêm nonce check trước submit để phòng ngừa |

## Tệp cần sửa

| Tệp | Thay đổi |
|------|----------|
| Database | UPDATE + DELETE cho AngelKhaNhi |
| Component submit lockWithPPLP | Thêm nonce validation trước khi gửi tx |
