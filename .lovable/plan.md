
# Cập nhật giao diện Tặng Quà & Thẻ Chúc Mừng

## 4 thay đổi chính

### 1. Thay logo trên thẻ chúc mừng
Thay logo `camly-coin-rainbow.png` (hình tĩnh) bằng file GIF mới do con upload (`Bản_sao_của_Bản_sao_của_LOGO_FUN_ECOSYSTEM_18_1_2026_1920_x_1920_px_13.gif`). Logo mới sẽ được áp dụng trên tất cả các thẻ chúc mừng:
- `DonationReceivedCard.tsx` (thẻ nhận quà)
- `DonationSuccessCard.tsx` (thẻ gửi quà)
- `GiftCelebrationModal.tsx` (thẻ chúc mừng chính)
- `ClaimRewardDialog.tsx` (claim CAMLY)
- `ClaimFunDialog.tsx` (claim FUN)

### 2. Gỡ bỏ nút lăn chuột (spinner) và nút MAX trong ô Số lượng
Trong `UnifiedGiftSendDialog.tsx`:
- Chuyển input từ `type="number"` sang `type="text"` để loại bỏ hoàn toàn nút tăng/giảm (spinner arrows)
- Thêm CSS ẩn spinner cho trình duyệt (Chrome/Firefox)
- Xóa nút "MAX" bên cạnh ô nhập số lượng
- Giữ nguyên logic nhập liệu, chỉ cho phép nhập số

### 3. Đồng bộ Profile + Username + Địa chỉ ví trong mục Người nhận
Cập nhật query tìm kiếm trong `UnifiedGiftSendDialog.tsx`:
- Thêm cột `custodial_wallet_address` vào `selectFields` để đồng bộ đầy đủ 3 loại ví
- Hiển thị thêm địa chỉ ví (rút gọn) ngay dưới username trong kết quả tìm kiếm
- Đảm bảo hàm `resolveWalletAddress` đã tìm đúng thứ tự ưu tiên: `public_wallet_address` > `custodial_wallet_address` > `wallet_address`

### 4. Hiệu ứng chữ "RICH" nhảy múa trên thẻ chúc mừng
Thêm hiệu ứng chữ "RICH" bay nhảy trực tiếp bên trong thẻ chúc mừng (không chỉ ở lớp nền mà còn xung quanh nội dung card):
- Thêm lớp `RICH` text animation vào bên trong `GiftCelebrationModal.tsx`, `DonationReceivedCard.tsx`, và `DonationSuccessCard.tsx`
- Sử dụng animation `rich-float` đã có sẵn trong tailwind config
- Chữ "RICH" xuất hiện ở nhiều vị trí ngẫu nhiên với 9 màu cầu vồng, hiệu ứng nhảy múa liên tục

---

## Chi tiết kỹ thuật

**File mới:**
- Copy file GIF upload vào `src/assets/tokens/fun-ecosystem-logo.gif`

**File cần sửa:**
1. `src/components/donations/DonationReceivedCard.tsx` - Thay logo + thêm RICH text
2. `src/components/donations/DonationSuccessCard.tsx` - Thay logo + thêm RICH text
3. `src/components/donations/GiftCelebrationModal.tsx` - Thay logo + thêm RICH text
4. `src/components/wallet/ClaimRewardDialog.tsx` - Thay logo
5. `src/components/wallet/ClaimFunDialog.tsx` - Thay logo
6. `src/components/donations/UnifiedGiftSendDialog.tsx` - Gỡ spinner + MAX, cập nhật search query
