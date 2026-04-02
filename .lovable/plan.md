

# Sửa hiển thị số lượng BTC và địa chỉ ví BTC trong lịch sử donation

## Vấn đề

1. **Hình 1**: Lịch sử donation hiện "0 BTC" thay vì "0.0001 BTC" — do `formatNumber(parseFloat(amount))` dùng `decimals=0` mặc định → làm tròn về 0
2. **Hình 1**: Địa chỉ ví hiển thị là EVM (0x44d1...3858) thay vì BTC (bc1q...) — do query chỉ lấy `public_wallet_address` và `getWalletAddress` chỉ trả về địa chỉ EVM

## Thay đổi

### 1) `src/hooks/useAdminDonationHistory.ts`
- Thêm `btc_address` vào select query cho cả sender và recipient: `sender:public_profiles!...(id, username, avatar_url, public_wallet_address, btc_address)`
- Tương tự cho `fetchAllDonationsForExport`

### 2) `src/hooks/useDonationHistory.ts`
- Thêm `btc_address?: string | null` vào interface `DonationRecord` (sender và recipient)
- Thêm `btc_address` vào select query

### 3) `src/components/donations/SystemDonationHistory.tsx`
- **Sửa `getWalletAddress`**: khi `token_symbol === 'BTC'`, trả về `user?.btc_address` thay vì `public_wallet_address`
- **Sửa dòng 459-460**: `senderWallet` và `recipientWallet` cần xét token_symbol để chọn đúng loại địa chỉ
- **Sửa dòng 539**: `formatNumber(parseFloat(donation.amount))` → thêm logic: nếu `token_symbol === 'BTC'`, dùng `maximumFractionDigits: 8` để hiển thị đủ chữ số thập phân
- **Sửa dòng 493, 513**: Link explorer cho BTC dùng `getExplorerAddressUrl` thay vì `getBscScanAddressUrl`

### 4) `src/hooks/usePublicDonationHistory.ts` (nếu có select query tương tự)
- Thêm `btc_address` vào select query để đồng bộ

## Kết quả
- "0.0001 BTC" hiển thị đúng thay vì "0 BTC"
- Địa chỉ ví BTC (bc1q...) hiển thị đúng cho cả sender và recipient khi token là BTC
- Link explorer dẫn đến Mempool.space thay vì BscScan cho giao dịch BTC

