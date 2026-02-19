

## Hiển thị địa chỉ ví rút gọn cho giao dịch ngoài

### Vấn đề hiện tại
1. **Trang /donations**: Hiển thị `@Unknown` thay vì địa chỉ ví rút gọn khi sender là ví bên ngoài (không có profile)
2. **Trang /wallet/history**: Địa chỉ ví rút gọn chưa thống nhất - tên hiển thị dùng 6+6 ký tự, nhưng dòng ví bên dưới dùng 4+4 ký tự
3. **Query /donations**: Chưa lấy trường `sender_address` và `is_external` từ database

### Giải pháp

**1. Cập nhật hook `useAdminDonationHistory.ts`**
- Thêm `sender_address`, `is_external` vào cả 2 query (danh sách + export)
- Map các trường mới vào kết quả trả về

**2. Cập nhật `SystemDonationHistory.tsx` (trang /donations)**
- Thay `@Unknown` bằng địa chỉ ví rút gọn `shortenAddress(sender_address)` khi sender không có profile
- Dùng `sender_address` làm fallback cho `senderWallet` khi sender là null
- Hiển thị badge "Onchain" cho giao dịch ngoài (giống /wallet/history)
- Cập nhật celebration card data để dùng địa chỉ ví rút gọn thay vì "Unknown"

**3. Chuẩn hóa định dạng địa chỉ ví rút gọn**
- Thống nhất format: 6 ký tự đầu + 4 ký tự cuối (ví dụ: `0x68d2...aFaa`)
- Cập nhật tất cả các lệnh gọi `shortenAddress` trong cả 2 component để dùng `shortenAddress(address, 4)` (mặc định: `0x` + 4 hex + `...` + 4 hex = `0x1234...5678`)
- Riêng tên hiển thị của sender ngoài cũng dùng cùng format

### Chi tiết kỹ thuật

**Files cần sửa:**

| File | Thay đổi |
|------|----------|
| `src/hooks/useAdminDonationHistory.ts` | Thêm `sender_address, is_external` vào SELECT query |
| `src/components/donations/SystemDonationHistory.tsx` | Fallback sender name = shortenAddress, fallback senderWallet = sender_address |
| `src/components/wallet/DonationHistoryTab.tsx` | Chuẩn hóa shortenAddress format (4 chars) |

**Logic thay đổi chính trong SystemDonationHistory:**

```text
Hiện tại:  donation.sender?.username || 'Unknown'
Sau sửa:   donation.sender?.username || (donation.sender_address ? shortenAddress(donation.sender_address) : 'Unknown')

Hiện tại:  senderWallet = getWalletAddress(donation.sender)
Sau sửa:   senderWallet = getWalletAddress(donation.sender) || donation.sender_address
```

