

## Ghi nhận giao dịch từ ví ngoài cụ thể

### Cách tiếp cận

Thay đổi Edge Function `detect-incoming-transfers` để nhận **địa chỉ ví ngoài cụ thể + tên** thay vì quét tự động cho user đang đăng nhập. Function sẽ:

1. Nhận params: `sender_address` (ví ngoài) + `sender_name` (tên gán cho ví đó)
2. Gọi Moralis API lấy lịch sử chuyển tiền CỦA ví ngoài đó
3. Lọc chỉ những giao dịch chuyển ĐẾN một `public_wallet_address` có trong Fun Profile
4. Ghi nhận vào bảng `donations` với `is_external = true`, lưu `sender_name` trong cột `metadata`

### Xóa dữ liệu cũ

Vẫn còn 41 bản ghi `is_external = true` từ lần trước cần xóa sạch trước khi ghi nhận mới.

### Thay doi chi tiet

**1. Xóa 41 bản ghi external còn lại**

```text
DELETE FROM donations WHERE is_external = true
```

**2. Sửa Edge Function `detect-incoming-transfers`**

Thay đổi logic:
- Bỏ xác thực user (chuyển sang xác thực admin qua service role key)
- Nhận body: `{ sender_address, sender_name }`
- Gọi Moralis API cho `sender_address`
- Lấy tất cả `public_wallet_address` từ bảng `profiles` để map `to_address` -> `recipient_id`
- Chỉ ghi nhận giao dịch chuyển đến ví Fun Profile
- Lưu `sender_name` trong `metadata: { sender_name: "LH Happy" }`
- Set `created_at = block_timestamp` để đúng thứ tự thời gian

**3. Gọi Edge Function cho 4 ví**

Sau khi deploy, gọi function với:

| Dia chi | Ten |
|---------|-----|
| 0x189EE1D2Aa474C04CcF9411f429f0cf494a1151d | LH Hao Quang Vu Tru |
| 0x1BC49d17198E3beedd4B6dcC66946CBF532d48EB | LH Happy |
| 0xc47ea868E2cA8f44E7Cf6448AbaDA7B5F567eA84 | LH Y Cha |
| 0xAa498Ad9821D34816F0E8F6e461424A878f4e98d | LH Thinh Vuong |

### Hien thi sender_name

Cac component hien thi lich su giao dich se duoc cap nhat de doc `sender_name` tu `metadata` khi `is_external = true`, hien thi ten nay thay vi "Nguoi dung ben ngoai".

### Files can sua

| File | Thay doi |
|------|----------|
| `supabase/functions/detect-incoming-transfers/index.ts` | Viết lại logic: nhận sender_address + sender_name, quét FROM vi ngoai TO Fun Profile users |
| `src/hooks/useDonationHistory.ts` | Doc sender_name tu metadata de hien thi |
| `src/hooks/useAdminDonationHistory.ts` | Tuong tu |

### Bao mat

- Edge Function yeu cau `SUPABASE_SERVICE_ROLE_KEY` trong header de xac thuc (chi admin/owner moi goi duoc)
- Khong co auto-scan, chi chay khi duoc yeu cau thu cong

