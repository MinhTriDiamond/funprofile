

## Kế hoạch sửa 2 vấn đề

### 1. Sửa Google row — đơn giản

Trong `SecuritySettings.tsx`, dòng Google:
- Khi `hasGoogleIdentity = false`: hiển thị "Chưa liên kết" thay vì "Sẽ hỗ trợ sớm"
- Khi `hasGoogleIdentity = true`: hiển thị "Đã liên kết"
- Bỏ `disabled: true` và `actionLabel: 'Sẽ hỗ trợ sớm'`
- Phase 1 chưa có nút link Google inline, nên khi chưa linked chỉ hiển thị trạng thái, không có action button

### 2. Sửa LinkWalletDialog — cần tích hợp wallet signing

**Vấn đề gốc**: Edge function yêu cầu `{ wallet_address, signature, message }` nhưng dialog chỉ gửi `{ wallet_address }`.

**Giải pháp**: Thay đổi flow trong `LinkWalletDialog.tsx`:

1. User dán địa chỉ ví (giữ nguyên)
2. Khi bấm "Liên kết ví":
   - Mở RainbowKit connect modal (nếu chưa connected)
   - Sau khi connected, kiểm tra address khớp với address đã dán
   - Ký message xác thực bằng `useSignMessage` từ wagmi
   - Gửi `{ wallet_address, signature, message }` tới edge function
3. Nếu ví connected không khớp → thông báo lỗi

**Imports cần thêm**: `useAccount`, `useSignMessage`, `useDisconnect` từ wagmi, `useConnectModal` từ RainbowKit.

**Flow tương tự** `WalletLoginContent.tsx` đã có sẵn — tái sử dụng pattern ký message.

### Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/security/LinkWalletDialog.tsx` | Tích hợp wagmi signing flow |
| `src/pages/SecuritySettings.tsx` | Sửa Google row bỏ "Sẽ hỗ trợ sớm" |

