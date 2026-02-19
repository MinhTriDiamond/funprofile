

## Dọn dẹp giao dịch ví ngoài và sắp xếp lại thứ tự thời gian

### Tình trạng hiện tại
- Có **59 giao dịch từ ví ngoài** (is_external = true) trong tổng số 552 giao dịch
- Hệ thống đang tự động quét giao dịch ngoài mỗi 5 phút khi user vào trang Ví
- Thứ tự hiển thị đang sort theo `created_at` thay vì thời gian onchain

### Kế hoạch

**Bước 1: Xóa toàn bộ giao dịch ví ngoài**
- Chạy lệnh: `DELETE FROM donations WHERE is_external = true`
- Xóa 59 bản ghi, giữ nguyên 493 giao dịch nội bộ

**Bước 2: Tắt cơ chế tự động quét**
- Xóa lệnh gọi `useIncomingTransferDetector()` trong `WalletProviders.tsx`
- Giữ nguyên file hook và Edge Function để sẵn sàng dùng khi cần

**Bước 3: Sắp xếp lại thứ tự thời gian**
- Cập nhật query trong `useAdminDonationHistory.ts` và `useDonationHistory.ts`:
  - Sort chính theo `confirmed_at` (thời gian onchain), fallback `created_at`
- Backfill dữ liệu hiện tại: đồng bộ `created_at` = `confirmed_at` cho các record lệch thời gian

### Chi tiết kỹ thuật

| Thao tác | Chi tiết |
|----------|----------|
| Xóa dữ liệu | `DELETE FROM donations WHERE is_external = true` (59 records) |
| Tắt auto-scan | Bỏ `useIncomingTransferDetector()` khỏi `WalletProviders.tsx` |
| Sửa sort query | `.order('confirmed_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })` |
| Backfill | `UPDATE donations SET created_at = confirmed_at WHERE confirmed_at IS NOT NULL AND created_at > confirmed_at + interval '1 minute'` |

**Files cần sửa:**
- `src/components/wallet/WalletProviders.tsx` - bỏ auto-scan
- `src/hooks/useAdminDonationHistory.ts` - sửa sort order
- `src/hooks/useDonationHistory.ts` - sửa sort order

**Giữ nguyên (không xóa):**
- `src/hooks/useIncomingTransferDetector.ts` - hook sẵn sàng dùng lại
- `supabase/functions/detect-incoming-transfers/index.ts` - Edge Function sẵn sàng
- Các cột `is_external`, `sender_address` trong bảng `donations`

Khi cần ghi nhận giao dịch ví ngoài cho một địa chỉ cụ thể, chỉ cần chat yêu cầu và sẽ chạy thủ công Edge Function hoặc insert trực tiếp.

