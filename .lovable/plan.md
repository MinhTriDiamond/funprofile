
## Phân tích nguyên nhân gốc 2 lỗi

### Lỗi 1: Sai link liên kết trong trang cá nhân (đã fix một phần)
**Nguyên nhân gốc:**
- `AvatarOrbit.tsx` nhận prop `userId` từ component cha (ProfilePage). Khi user A đang xem profile của user B rồi điều hướng nhanh sang profile của chính mình, prop `userId` đổi từ B → A nhưng `socialLinks` state local vẫn còn dữ liệu của B trong khoảnh khắc render.
- Nếu trong khoảnh khắc đó có effect tự động lưu (auto-fetch icon, persist), DB ghi `socialLinks của B` vào `profiles.id = A` → links hiện sai chéo user.
- Đã thêm guard `userId === authUserId` nhưng còn 2 chỗ rò rỉ: (a) state `socialLinks` không reset khi `userId` đổi, (b) `isOwner` prop có thể bị stale làm `canWrite` hoạt động sai chiều ngược lại (block hợp lệ).

### Lỗi 2: Lệnh giao dịch sai (gift/donation gắn nhầm người nhận)
**Giả thuyết cần xác minh:** Cùng một mẫu race condition như lỗi link — `UnifiedGiftSendDialog` hoặc `WalletTransactionHistory` nhận `recipientUserId`/`recipientWallet` qua prop. Khi user mở dialog cho người A rồi đóng nhanh và mở lại cho người B, state `wallet`/`recipient` cũ chưa kịp reset → giao dịch ký với địa chỉ A nhưng metadata lưu user B (hoặc ngược lại).

**Cần đọc thêm trước khi sửa:**
- `src/components/profile/AvatarOrbit.tsx` (toàn bộ flow state)
- `src/components/donations/UnifiedGiftSendDialog.tsx` (recipient state lifecycle)
- `src/components/profile/SocialLinksEditor.tsx` (input → callback)

## Kế hoạch sửa (2 file chính)

### A. `AvatarOrbit.tsx` — chống rò state cross-user
1. **Reset state khi `userId` đổi**: thêm `useEffect([userId])` clear `socialLinks`, `isSaving`, input pending về initial.
2. **Khoá `canWrite` chỉ phụ thuộc auth**: `canWrite = !!authUserId && userId === authUserId` (bỏ `isOwner` để tránh stale prop block hợp lệ; `isOwner` chỉ dùng cho UI).
3. **Stamp request bằng `userId` snapshot**: trước mỗi `persistLinks`, capture `targetId = userId`; trong callback resolve, nếu `targetId !== authUserId` → bỏ qua. Pattern này đã ghi nhận ở memory `mem://security/social-links-integrity-guard`.
4. **Toast feedback**: `toast.error("Không thể lưu — vui lòng tải lại")` khi block, `toast.success("Đã cập nhật mạng xã hội")` khi xong, `isSaving` disable nút "Thêm".

### B. `UnifiedGiftSendDialog.tsx` — chống gửi nhầm người
1. **Reset toàn bộ state khi `recipientUserId` đổi hoặc dialog đóng**: amount, message, txHash, recipient resolved wallet.
2. **Snapshot recipient tại thời điểm bấm "Gửi"**: capture `frozenRecipient = { userId, wallet }` vào local const, dùng xuyên suốt async flow (sign → broadcast → record-donation). Không đọc lại từ state/prop sau await.
3. **Verify wallet match trước khi gọi `record-donation`**: nếu `frozenRecipient.wallet !== currentRecipientFromProp.wallet` → abort với toast cảnh báo.

### C. (Tuỳ chọn) Memory update
Mở rộng `mem://security/social-links-integrity-guard` thành rule chung "snapshot prop trước async, reset state khi prop key đổi" áp dụng cho cả donation flow.

## Phạm vi
- 2 file UI chính, không đụng schema/RLS/edge function.
- Không thay đổi giao diện, chỉ thêm guard logic + toast.
