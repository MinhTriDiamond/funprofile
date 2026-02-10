
# Hiển Thị Địa Chỉ Ví Công Khai Mặc Định Từ Ví Đã Kết Nối

## Mục tiêu

Khi user chưa cập nhật `public_wallet_address`, hệ thống sẽ tự động hiển thị địa chỉ ví đã kết nối (`external_wallet_address`) làm mặc định. User có thể chỉnh sửa và lưu địa chỉ ví khác nếu muốn.

## Thay đổi

### 1. `src/pages/Profile.tsx` -- Hiển thị fallback wallet address

Thay đổi logic hiển thị ví tại dòng 464-494:

- Hiện tại: chỉ hiển thị `public_wallet_address`
- Sau khi sửa: hiển thị `public_wallet_address || external_wallet_address || custodial_wallet_address`
- Thứ tự ưu tiên: public (do user chọn) > external (ví kết nối) > custodial (ví hệ thống)
- Nếu không có ví nào: giữ CTA "Thêm địa chỉ ví" cho chủ profile, "Chưa cập nhật" cho người khác

Dữ liệu `external_wallet_address` đã được fetch sẵn trong query (dòng 142).

### 2. `src/components/profile/EditProfile.tsx` -- Prefill ví mặc định

Thay đổi logic khởi tạo `publicWalletAddress` tại dòng 71:

- Hiện tại: `setPublicWalletAddress(data.public_wallet_address || '')`
- Sau khi sửa: `setPublicWalletAddress(data.public_wallet_address || data.external_wallet_address || '')`
- Khi user mở Edit Profile lần đầu mà chưa có `public_wallet_address`, input sẽ tự điền sẵn địa chỉ ví đã kết nối
- User có thể giữ hoặc sửa, rồi bấm Lưu để cập nhật vào `public_wallet_address`

### Tóm tắt

| File | Dòng | Thay đổi |
|------|------|----------|
| `Profile.tsx` | ~465 | Fallback: `public_wallet_address \|\| external_wallet_address \|\| custodial_wallet_address` |
| `EditProfile.tsx` | 71 | Prefill: `public_wallet_address \|\| external_wallet_address \|\| ''` |

Chỉ 2 dòng code thay đổi, không ảnh hưởng DB hay RLS.
