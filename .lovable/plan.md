
Mục tiêu

- Khi chọn mạng BTC trong dialog gửi quà, cả “Người gửi” và “Người nhận” đều hiển thị đúng địa chỉ BTC.
- Trang cá nhân hiển thị ví BTC ngay khu vực header như hình tham chiếu, không chỉ nằm trong tab Giới thiệu.
- Sau khi lưu ví BTC ở trang Chỉnh sửa hồ sơ, giao diện cập nhật ngay mà không cần tải lại trang.

Nguyên nhân hiện tại

- `src/components/donations/gift-dialog/GiftFormStep.tsx`: phần “Người gửi” luôn hiển thị `effectiveAddress` (địa chỉ EVM), trong khi “Người nhận” đã chuyển sang `recipient.btcAddress` khi chọn BTC.
- `src/components/donations/gift-dialog/GiftConfirmStep.tsx`: bước xác nhận vẫn hiển thị sender/recipient theo địa chỉ EVM, chưa đồng bộ với mạng BTC.
- `src/components/profile/ProfileHeader.tsx`: header chỉ render ví EVM (`public_wallet_address` / `external_wallet_address`). Ví BTC hiện chỉ có trong `src/pages/Profile.tsx` ở tab Giới thiệu.
- `src/components/profile/EditProfile.tsx`: đã lưu `btc_address` vào database, nhưng chưa báo ngược cho `Profile` để refresh state ngay sau khi lưu.

Kế hoạch triển khai

1. Chuẩn hoá địa chỉ hiển thị theo mạng trong luồng gửi quà
- `src/components/donations/UnifiedGiftSendDialog.tsx`
  - Tạo giá trị dùng chung kiểu `senderDisplayAddress`:
    - BTC: `senderProfile?.btc_address`
    - EVM: `effectiveAddress`
  - Tạo logic hiển thị recipient theo mạng để mọi step dùng cùng một nguồn.
  - Truyền dữ liệu này xuống `GiftFormStep` và `GiftConfirmStep`.
  - Rà lại phần build dữ liệu success/celebration để BTC không còn dùng nhầm địa chỉ EVM.

2. Sửa phần hiển thị “Người gửi / Người nhận” khi chọn BTC
- `src/components/donations/gift-dialog/GiftFormStep.tsx`
  - Bổ sung `btc_address` vào kiểu `SenderProfile`.
  - Đổi phần “Người gửi” sang hiển thị địa chỉ theo `selectedChainId`; nếu là BTC thì hiện `senderProfile.btc_address`.
  - Ẩn hoặc điều chỉnh cảnh báo mismatch ví EVM khi đang ở mạng BTC.
  - Giữ “Người nhận” hiển thị `btcAddress` khi chọn BTC.
- `src/components/donations/gift-dialog/GiftConfirmStep.tsx`
  - Bước xác nhận cũng phải hiển thị sender/recipient theo đúng mạng đang chọn, tránh bước 1 đúng nhưng bước 2 quay lại EVM.

3. Đồng bộ các nơi mở dialog gửi quà
- Rà và bổ sung `recipientBtcAddress` ở các wrapper còn thiếu, đặc biệt:
  - `src/modules/chat/components/SendCryptoModal.tsx`
  - `src/modules/chat/components/CryptoGiftButton.tsx` nếu còn dùng
- Mục tiêu: mở dialog từ chat, profile, post hay wallet đều truyền đủ địa chỉ BTC của người nhận.

4. Hiển thị ví BTC đúng chỗ trên trang cá nhân
- `src/components/profile/ProfileHeader.tsx`
  - Giữ pill ví EVM hiện tại.
  - Bổ sung thêm 1 pill/row ví BTC ngay dưới khu vực `fun.rich/{username}` / dưới ví EVM:
    - icon BTC
    - địa chỉ rút gọn
    - nút copy
  - Nếu là chủ hồ sơ mà chưa có `btc_address`, hiện CTA dẫn sang tab chỉnh sửa.
- `src/pages/Profile.tsx`
  - Có thể giữ phần BTC trong tab Giới thiệu, nhưng header sẽ là vị trí hiển thị chính đúng như user mong muốn.

5. Cập nhật ngay sau khi lưu ở Chỉnh sửa hồ sơ
- `src/components/profile/EditProfile.tsx`
  - Thêm callback như `onProfileUpdated` hoặc `onSaved`.
  - Sau khi update thành công, trả dữ liệu mới (`btc_address`, `public_wallet_address`, và các field liên quan nếu cần) cho component cha.
- `src/pages/Profile.tsx`
  - Truyền callback vào `EditProfile`.
  - Cập nhật `profile` state trực tiếp hoặc gọi `handleRefresh()` sau save để header + tab Giới thiệu đổi ngay, không cần F5.

Chi tiết kỹ thuật

- Không cần sửa backend thêm: `btc_address` đã có trong `profiles`, `public_profiles` và `useProfile`.
- `ReceiveTab.tsx` hiện đã hỗ trợ `selectedNetwork === 'bitcoin'`; lỗi chính đang nằm ở dialog gửi và vị trí hiển thị trên profile.
- Nên gom logic “địa chỉ theo mạng” vào 1 helper dùng chung để tránh mỗi step xử lý khác nhau.

Kết quả mong muốn

- Chọn mạng BTC trong dialog: cả “Người gửi” và “Người nhận” đều hiện đúng địa chỉ BTC.
- Bước xác nhận BTC không còn hiện lại địa chỉ EVM.
- Sau khi user lưu ví BTC ở trang chỉnh sửa, trang cá nhân hiển thị ngay ví BTC ở khu vực header.
- Mọi đường mở dialog gửi quà đều dùng đúng `btcAddress`, không còn chỗ nào hiển thị lệch mạng.
