
# Đồng bộ hiệu ứng chúc mừng trên toàn bộ tính năng Ví

## Tổng quan
Hiện tại, bảng thông báo chúc mừng (logo CAMLY, chữ "RICH" nhảy múa, pháo hoa) đã có sẵn trong các dialog Claim CAMLY, Claim FUN, và Gift/Donation. Yêu cầu là đảm bảo tất cả các flow trên Ví (gửi, tặng, claim) đều hiển thị đúng hiệu ứng chúc mừng đồng bộ, và kết nối ví hoạt động mượt mà trên cả máy tính và điện thoại.

## Các thay đổi cần thực hiện

### 1. Thêm hiệu ứng chúc mừng cho ClaimRewardDialog (Claim CAMLY)
File: `src/components/wallet/ClaimRewardDialog.tsx`
- Thêm `RichTextOverlay` (chữ "RICH" nhảy múa 9 màu cầu vồng) vào bước success, hiện tại chỉ có `DonationCelebration` (confetti) nhưng thiếu `RichTextOverlay` riêng
- Đảm bảo pháo hoa + RICH text + nhạc rich-3 loop đều chạy đồng bộ khi claim thành công

### 2. Thêm hiệu ứng chúc mừng cho ClaimFunDialog (Claim FUN)
File: `src/components/wallet/ClaimFunDialog.tsx`
- Tương tự: thêm `RichTextOverlay` vào giao diện success
- Hiện tại đã có `DonationCelebration` với `showRichText={true}`, nhưng cần thêm `RichTextOverlay` component riêng để đảm bảo chữ RICH nổi lên trên Dialog Portal (z-[9999])

### 3. Thêm hiệu ứng cho UnifiedGiftSendDialog khi gửi thành công
File: `src/components/donations/UnifiedGiftSendDialog.tsx`
- Kiểm tra và đảm bảo khi giao dịch gửi/tặng thành công, `GiftCelebrationModal` được hiển thị với đầy đủ hiệu ứng (confetti, RICH text, nhạc) -- flow này đã có sẵn

### 4. Đồng bộ callback refetch dữ liệu sau giao dịch
File: `src/components/wallet/WalletCenterContainer.tsx`
- Sau khi gửi quà (UnifiedGiftSendDialog `onSuccess`): đã gọi `refetchExternal()` -- cần thêm `fetchClaimableReward()` để cập nhật số dư claimable
- Sau khi Claim CAMLY/FUN thành công: đã có callback refetch -- xác nhận đúng

### 5. Tối ưu kết nối ví trên mobile
File: `src/components/wallet/WalletCenterContainer.tsx`
- Đảm bảo nút "Connect Wallet" sử dụng `useConnectModal` từ RainbowKit (đã đúng)
- Thêm padding/sizing phù hợp cho mobile (nút lớn hơn, dễ bấm hơn trên điện thoại)
- Đảm bảo Dialog chúc mừng hiển thị đúng trên mobile (`max-h-[90vh] overflow-y-auto`)

---

## Chi tiết kỹ thuật

**Files cần sửa:**

1. **`src/components/wallet/ClaimRewardDialog.tsx`**
   - Import `RichTextOverlay` từ `@/components/donations/RichTextOverlay`
   - Thêm `{step === 'success' && <RichTextOverlay />}` cùng cấp với `DonationCelebration`

2. **`src/components/wallet/ClaimFunDialog.tsx`**
   - Import `RichTextOverlay`
   - Thêm `{showSuccess && <RichTextOverlay />}` vào block return success

3. **`src/components/wallet/WalletCenterContainer.tsx`**
   - Cập nhật `onSuccess` callback của `UnifiedGiftSendDialog` để thêm `fetchClaimableReward()` bên cạnh `refetchExternal()`
   - Tăng kích thước nút Connect Wallet trên mobile: thêm class responsive `text-base md:text-lg py-5 md:py-6`

4. **`src/components/donations/DonationCelebration.tsx`** -- Không cần sửa, đã có z-[9999]

5. **`src/components/donations/RichTextOverlay.tsx`** -- Không cần sửa, đã có fixed + z-[9999]

## Kết quả mong đợi
- Khi user **gửi/tặng quà**: hiển thị GiftCelebrationModal với logo GIF, RICH text nhảy múa, pháo hoa, nhạc rich-3
- Khi user **Claim CAMLY**: hiển thị bảng thành công với logo GIF, RICH text nhảy múa, pháo hoa, nhạc rich-3
- Khi user **Claim FUN**: hiển thị bảng thành công với logo GIF, RICH text nhảy múa, pháo hoa, nhạc rich-3
- Sau mỗi giao dịch, số dư ví và claimable amount tự động cập nhật
- Kết nối ví mượt mà trên cả desktop và mobile
