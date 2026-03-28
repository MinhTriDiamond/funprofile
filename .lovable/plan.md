

## Tự động liên kết ví khi user dán địa chỉ ví trong trang chỉnh sửa hồ sơ

### Vấn đề hiện tại
- Khi user dán địa chỉ ví vào ô **"Địa chỉ ví công khai"** trong EditProfile, hệ thống chỉ cập nhật `public_wallet_address`
- Các field khác (`external_wallet_address`, `wallet_address`) không được cập nhật → hệ thống vẫn coi là chưa liên kết ví → banner "Liên kết ví" vẫn hiện, tặng quà không hoạt động

### Giải pháp
Sửa **1 file**: `src/components/profile/EditProfile.tsx`

Trong hàm `handleSubmit`, khi user nhập `publicWalletAddress` hợp lệ (format `0x...` 42 ký tự), **cập nhật thêm** `external_wallet_address` và `wallet_address` cùng lúc:

```ts
// Trước (chỉ cập nhật public_wallet_address)
public_wallet_address: publicWalletAddress || null,

// Sau (cập nhật cả 3 field ví nếu là địa chỉ hợp lệ)
public_wallet_address: publicWalletAddress || null,
external_wallet_address: isValidWallet ? publicWalletAddress.toLowerCase() : undefined,
wallet_address: isValidWallet ? publicWalletAddress.toLowerCase() : undefined,
```

- Thêm validation: `const isValidWallet = /^0x[a-fA-F0-9]{40}$/.test(publicWalletAddress)`
- Chỉ cập nhật `external_wallet_address` và `wallet_address` khi địa chỉ hợp lệ
- Chuẩn hoá lowercase theo policy hiện tại
- Invalidate query `profile-security` sau khi save để banner cập nhật ngay

### Lưu ý bảo mật
- Cách này **không yêu cầu ký xác thực** (khác với LinkWalletDialog)
- Phù hợp cho trường hợp user muốn nhanh chóng liên kết ví để nhận quà
- Luồng LinkWalletDialog (ký xác thực) vẫn giữ nguyên cho ai muốn bảo mật cao hơn

### Quy mô
- 1 file sửa (`EditProfile.tsx`)

