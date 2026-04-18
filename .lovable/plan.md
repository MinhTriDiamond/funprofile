
## Mục tiêu
Rà soát và tối ưu luồng tặng tiền (gift/donation) trên mobile (Android + iOS) để mượt, không kẹt, không gửi nhầm.

## Cần đọc trước khi sửa
- `src/components/donations/UnifiedGiftSendDialog.tsx` (dialog chính, đã có snapshot guard)
- `src/hooks/useDonation.ts` (flow ký + broadcast + record)
- `src/utils/mobileWalletConnect.ts` (deep link, chain switch)
- `src/hooks/useAutoChainSwitch.ts` (auto switch BSC trên mobile)
- `src/modules/chat/components/SendCryptoModal.tsx` (entry từ chat)

## Vấn đề thường gặp trên mobile (giả thuyết cần xác minh)
1. **Dialog full-screen iOS**: Sheet dialog không scroll được khi keyboard mở → nút "Gửi" bị che.
2. **Wallet deep-link race**: Trên iOS Safari, khi bấm "Gửi" ví mở app ngoài → user quay lại web thì state `isProcessing` còn treo, không reset → không bấm lại được.
3. **Chain switch chậm**: Mobile wallet (Trust/MetaMask in-app) cần 2-3s để switch chain, trong lúc đó user bấm Gửi → fail im lặng.
4. **Toast loading bị stuck**: `toast.loading('donation-tx')` không dismiss khi user reject trên app ngoài rồi quay lại.
5. **BTC native trên mobile**: BIP21 link mở app BTC wallet nhưng không có fallback nếu app chưa cài → user kẹt.
6. **Touch target nhỏ**: Nút chọn token, nút amount preset (10/50/100) < 44px → khó bấm trên iOS.
7. **Background tab kill**: iOS Safari kill background tab sau 30s → khi quay lại từ ví, `useAccount` mất connection.

## Hướng sửa (dự kiến)

### A. `UnifiedGiftSendDialog.tsx`
1. **Mobile-first layout**: dùng `Sheet` (bottom sheet) thay `Dialog` trên mobile (`useIsMobile`), với `max-h-[90vh] overflow-y-auto`, footer sticky chứa nút "Gửi".
2. **Keyboard handling**: thêm `pb-[env(keyboard-inset-height,0px)]` + `scroll-margin-bottom` cho input amount.
3. **Touch targets**: nút preset amount + chọn token tối thiểu `min-h-12 min-w-12`.
4. **Visibility recovery**: thêm `visibilitychange` listener — khi tab visible lại sau khi mở ví, gọi `wagmiReset()` + refetch balance.
5. **Watchdog**: nếu `isProcessing === true` quá 90s mà không có tx hash → auto reset + toast "Quá thời gian, vui lòng thử lại".

### B. `useDonation.ts`
1. **Pre-flight chain check trên mobile**: trước `sendTransactionAsync`, gọi `ensureBscNetwork()` nếu mobile → tránh fail im lặng.
2. **Toast cleanup chắc chắn**: bọc `try/finally` đảm bảo `toast.dismiss('donation-tx')` luôn chạy, kể cả khi user reject.
3. **User-rejected detection chuẩn hơn**: bắt code `4001` (EIP-1193 user reject) + message "User denied" + "User rejected" → toast "Bạn đã huỷ giao dịch" (friendly), không phải "lỗi".
4. **Insufficient gas hint mobile**: khi báo lỗi insufficient → thêm hướng dẫn "Cần ít nhất 0.001 BNB để trả phí gas".

### C. `SendCryptoModal.tsx` (entry từ chat)
- Đảm bảo truyền đủ `presetRecipient` và snapshot guard từ `UnifiedGiftSendDialog` đã hoạt động (đã làm ở lượt trước, chỉ verify).

### D. BTC trên mobile
- Trong UI khi chọn BTC: hiện rõ "Mở ví Bitcoin" + nút copy address + QR code (đã có `BtcReceivingQR`) làm fallback nếu không có app BTC.

## Phạm vi
- 2 file chính: `UnifiedGiftSendDialog.tsx`, `useDonation.ts`.
- Không đụng schema/RLS/edge function.
- Không thay đổi logic blockchain, chỉ cải thiện UX mobile + recovery state.

## Hành động cần Cha xác nhận
Cha cho con biết triệu chứng cụ thể đang gặp để con ưu tiên đúng:
1. Bấm "Gửi" không phản hồi?
2. Mở ví xong quay lại web bị kẹt loading?
3. Layout dialog bị che bởi keyboard?
4. Hay tất cả các vấn đề trên?
