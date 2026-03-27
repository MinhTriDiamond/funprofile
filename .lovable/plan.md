

## Sửa hardcoded Vietnamese trong trang cá nhân

### Vấn đề
Trang cá nhân (profile) có nhiều chỗ hardcoded tiếng Việt dù user đã chọn English:
- **Honor Board**: "Bài viết", "Cảm xúc", "Bình luận", "Bạn bè", "Có thể rút", "Đã rút", "Hôm nay", "Tổng Thu"
- **Nút "Tặng Quà"** trong DonationButton
- **Nút "Lịch sử GD"** trong WalletTransactionHistory

### Giải pháp

#### 1. Sửa `src/components/profile/CoverHonorBoard.tsx`
Thay tất cả label hardcoded bằng `t()`:
- `"Bài viết"` → `t('posts')`
- `"Cảm xúc"` → `t('reactions')`
- `"Bình luận"` → `t('comments')`
- `"Bạn bè"` → `t('friends')`
- `"Có thể rút"` → `t('walletClaimable')`
- `"Đã rút"` → `t('walletClaimed')`
- `"Hôm nay"` → `t('walletToday')`
- `"Tổng Thu"` → `t('totalReward')`

Áp dụng cho cả **Desktop** (StatRow) và **Mobile** (MobileTotalRow).

#### 2. Sửa `src/components/donations/DonationButton.tsx`
- Import `useLanguage`
- Thay `"Tặng Quà"` → `t('gift')` (3 chỗ: profile variant, default variant, outline variant)

#### 3. Sửa `src/components/profile/WalletTransactionHistory.tsx`
- Thay `"Lịch sử GD"` → `t('transactionHistory')` (đã có key)

#### 4. Thêm translation key nếu thiếu
- Kiểm tra key `walletClaimable`, `walletClaimed`, `walletToday` đã có trong translations.ts — **đã có sẵn**, không cần thêm.

### Quy mô
- 3 file cần sửa
- Không cần thêm translation keys mới (các key đều đã tồn tại)

