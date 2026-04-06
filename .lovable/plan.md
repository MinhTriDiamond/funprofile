

# Sửa lỗi hiển thị lịch sử giao dịch cho thuongnguyen_camly

## Phát hiện

Database đầy đủ — 3 giao dịch gửi gần nhất đều `confirmed` với gift_celebration posts. Lỗi nằm ở phía frontend:

### Lỗi 1: Stale closure trong `usePublicDonationHistory`
- `fetchDonations` useCallback (dòng 322) thiếu `filter` trong deps → khi user đổi filter rồi đóng/mở dialog, hàm fetch dùng giá trị filter cũ, có thể trả về danh sách không đúng

### Lỗi 2: `WalletTransactionHistory` không truyền `userCreatedAt`
- Dòng 433: `usePublicDonationHistory(userId)` thiếu tham số `userCreatedAt`
- Không gây mất dữ liệu trực tiếp nhưng không nhất quán với thiết kế

### Lỗi 3: useEffect deps thiếu `fetchDonations`
- Dòng 436-442: `fetchDonations` và `fetchSummary` không nằm trong deps → khi dialog re-open, có thể gọi phiên bản cũ

## Giải pháp

### 1. `src/hooks/usePublicDonationHistory.ts`
- Thêm `filter` vào dependency array của `fetchDonations` useCallback
- Đảm bảo mỗi khi filter thay đổi, hàm fetch được tạo lại đúng

### 2. `src/components/profile/WalletTransactionHistory.tsx`
- Truyền `userCreatedAt` vào hook: `usePublicDonationHistory(userId, userCreatedAt)`
- Cập nhật useEffect deps để bao gồm `fetchDonations` và `fetchSummary`
- Thêm nút **Làm mới** (refresh) trong dialog header để user có thể ấn refresh thủ công nếu cần

## File cần sửa
| File | Thay đổi |
|------|----------|
| `src/hooks/usePublicDonationHistory.ts` | Thêm `filter` vào deps của `fetchDonations` |
| `src/components/profile/WalletTransactionHistory.tsx` | Truyền `userCreatedAt`, fix useEffect deps, thêm nút refresh |

