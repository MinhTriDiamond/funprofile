

# Sửa lỗi: Hộp thoại chúc mừng biến mất + Màn hình trắng sau khi tặng crypto từ Chat

## Nguyên nhân gốc

Có 2 vấn đề liên quan:

### 1. Celebration modal tự biến mất
Trong `UnifiedGiftSendDialog`, khi gửi thành công:
- `flowStep` chuyển thành `'celebration'`
- Main dialog đóng (vì `showMainDialog = isOpen && flowStep !== 'celebration'`)
- `DonationSuccessCard` hiển thị

Tuy nhiên, hàm `recordDonationBackground` chạy ngầm và gọi `invalidateDonationCache()` sau vài giây. Hàm này dispatch sự kiện `invalidate-feed` và `invalidate-donations`, khiến các component khác re-render. Nếu có lỗi async không được catch trong quá trình này (ví dụ: query refetch thất bại), nó gây ra **unhandled promise rejection** → React error boundary bắt → **màn hình trắng**.

### 2. `handleCloseCelebration` gọi `onClose()` ngay
Khi celebration đóng, nó gọi `onClose()` → `setShowCryptoModal(false)` trong ChatInput. Điều này đúng, nhưng nếu có lỗi xảy ra trước đó (từ cache invalidation), component đã unmount rồi.

## Giải pháp

### File 1: `src/components/donations/UnifiedGiftSendDialog.tsx`

1. **Wrap `recordDonationBackground` và `invalidateDonationCache` trong try/catch toàn diện** — ngăn mọi lỗi async crash app
2. **Thêm `try/catch` quanh `handleSendSingle` và `handleSendMulti`** — bảo vệ khỏi unhandled rejection
3. **Sửa `handleCloseCelebration`** — đảm bảo cleanup sạch sẽ, không gây lỗi khi unmount

### File 2: `src/components/donations/DonationSuccessCard.tsx`

1. **Loại bỏ mọi cơ chế auto-close** (hiện tại không có timer, nhưng cần đảm bảo dialog chỉ đóng khi user bấm nút X)
2. **Ngăn đóng khi click bên ngoài** — thêm `onOpenChange` handler chỉ cho phép đóng qua nút X, không cho phép click outside hay Escape tự đóng
3. **Wrap `handleClose` trong try/catch** — ngăn crash khi audio cleanup

## Các file cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/donations/UnifiedGiftSendDialog.tsx` | Wrap async operations trong try/catch, bảo vệ celebration state |
| `src/components/donations/DonationSuccessCard.tsx` | Ngăn dialog tự đóng khi click outside, chỉ đóng khi bấm X |

