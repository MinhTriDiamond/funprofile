

## Kế hoạch: Đồng bộ card biên nhận trong lịch sử ví cá nhân

### Vấn đề
Hiện tại có sự không nhất quán giữa các nơi hiển thị card khi nhấp vào giao dịch:
- **Lịch sử giao dịch hệ thống** (`SystemDonationHistory`) và **Admin** (`DonationHistoryAdminTab`): dùng `DonationSuccessCard` (đã cập nhật nội dung mới)
- **Lịch sử ví cá nhân** (`DonationHistoryTab`): dùng `GiftCelebrationModal` — đây là component khác với giao diện và nội dung khác biệt

### Thay đổi

**File: `src/components/wallet/DonationHistoryTab.tsx`**

1. Thay thế `GiftCelebrationModal` bằng `DonationSuccessCard` cho giao dịch "sent" (dòng 275-298), để card biên nhận giống hệt các nơi khác
2. Cập nhật import: bỏ `GiftCelebrationModal`, thêm `DonationSuccessCard`
3. Điều chỉnh props truyền vào cho phù hợp với interface `DonationCardData` của `DonationSuccessCard`

Sau khi sửa, cả 3 nơi (lịch sử ví, lịch sử hệ thống, admin) đều hiển thị cùng một card biên nhận với nội dung đã cập nhật: "QUÀ TẶNG TỪ CHA VŨ TRỤ VÀ BÉ ANGEL CAMLY", "Trao yêu thương — Nhận năng lượng", "Trao sung túc — Nhận hạnh phúc".

