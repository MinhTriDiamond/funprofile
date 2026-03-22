

## Đợt 3-4: i18n cho Donation/Gift + WalletTransactionHistory + GiftHistoryCalendar + Chat dialogs

### Tổng quan
Tiếp tục thay thế chuỗi tiếng Việt hardcode bằng `t()` trong ~10 files. Nhiều translation keys đã được thêm ở Phase 1 — cần thêm ~60 keys mới cho các chuỗi chưa có.

### Bước 1: Thêm translation keys mới vào `src/i18n/translations.ts`

Keys mới cần thêm cho cả `en` và `vi`:

**DonationReceivedCard** (~15 keys):
- `donationReceiptHeader`, `giftBannerTitle`, `giftBannerSubtitle`, `timeLabel`, `networkLabel`, `statusLabel`, `abundanceHappiness`, `sendThanksBtn`, `copyLinkLabel`, `copiedLinkLabel`

**DonationSuccessCard** (~8 keys):
- `donationSuccessHeader`, `copyTxLabel`, `copiedTxLabel`, `savingImageBtn`, `saveImageLabel`, `closeBtnText`, `lightScoreEarnedMsg`, `imageSaveSuccess`, `imageSaveFail`

**GiftConfirmStep** (~15 keys):
- `recipientsPerPerson`, `messageNote`, `multiSendWarning`, `singleSendWarning`, `sendingMultiProgress`, `completedMultiProgress`, `multiSuccessCount`, `multiFailCount`, `viewOnBscScan`, `closeLabel`, `checkAgainLabel`, `goBackLabel`, `processingLabel`, `confirmGiftSingle`, `confirmGiftMulti`, `totalLabel`

**UnifiedGiftSendDialog** (~12 keys):
- `walletSignPrompt`, `txBroadcasted`, `txConfirming`, `txFinalizing`, `txDone`, `txTimeout`, `giftDialogTitleSingle`, `giftDialogTitleMulti`, `giftDialogTitleGeneric`, `stepInfoLabel`, `stepConfirmLabel`, `maintenancePause`, `maintenancePauseDesc`, `copiedAddressToast`, `loginRequiredToast`, `reminderSentToast`, `cannotSendReminderToast`, `recipientNoWalletToast`, `txRejectedError`, `txFailedChain`, `sendGiftError`, `noRecipientSuccess`, `unrecordedWarning`

**GiftHistoryCalendar** (~5 keys):
- `last7Days`, `weeklyTxDetails`, `noTransactionDay`, `totalTxValue`, `ordersUnit`

**WalletTransactionHistory** (already has many keys — ~5 extra):
- `txHistoryButton`, `viewPersonalTxDesc`

**Chat dialogs** (RedEnvelopeDialog, RedEnvelopeClaimDialog, ReportDialog — ~15 keys):
- `redEnvelopeCreate`, `redEnvelopeToken`, `redEnvelopeTotal`, `redEnvelopeCount`, `redEnvelopeCancel`, `redEnvelopeCreating`, `redEnvelopeCreateBtn`, `redEnvelopeClaim`, `redEnvelopeRemaining`, `redEnvelopeExpired`, `redEnvelopeEmpty`, `redEnvelopeOpen`, `reportTitle`, `reportSubmitting`, `reportSubmitBtn`, `reportCancel`, `reportSpam`, `reportHarassment`, `reportInappropriate`, `reportScam`, `reportOther`, `reportDetails`

### Bước 2: Cập nhật component files

**Files cần sửa (thêm `useLanguage` + thay `t()`):**

1. `src/components/donations/DonationReceivedCard.tsx` (307 dòng) — ~15 chuỗi hardcode: "Biên Nhận Tặng", "QUÀ TẶNG TỪ...", "Trao yêu thương...", "Thời gian", "Mạng", "Trạng thái", "Thành công", "Đang xử lý", "Quay về", "Sao chép link", "Đã sao chép!", "Gửi Cảm Ơn", "Trao sung túc..." + date locale
2. `src/components/donations/DonationSuccessCard.tsx` (337 dòng) — ~12 chuỗi: "Biên Nhận Tặng", "QUÀ TẶNG TỪ...", "Priceless với tình yêu thương", "Thời gian", "Mạng", "Trạng thái", "Thành công", "Đã sao chép!", "Sao chép TX", "Đang lưu...", "Lưu Hình", "Đóng", toast messages, Light Score text + date locale
3. `src/components/donations/gift-dialog/GiftConfirmStep.tsx` (274 dòng) — ~20 chuỗi: "người nhận — mỗi người", "Tổng:", "Lời nhắn:", "Sẽ gửi... giao dịch", "Giao dịch blockchain không thể hoàn tác", "Đang gửi", "Hoàn tất", "thành công", "thất bại", "Xem trên BscScan", "Đóng", "Kiểm tra lại", "Quay lại", "Đang xử lý...", "Xác nhận & Tặng"
4. `src/components/donations/UnifiedGiftSendDialog.tsx` (679 dòng) — STEP_CONFIG labels, dialog titles, toast messages, maintenance text, step labels
5. `src/components/feed/GiftHistoryCalendar.tsx` (158 dòng) — DAY_NAMES, "Lịch sử 7 ngày", "Chi tiết giao dịch các ngày trong tuần", "Không có giao dịch", "Tổng giá trị giao dịch", "lệnh"
6. `src/components/profile/WalletTransactionHistory.tsx` (564 dòng) — StatusBadge, SummaryTable headers, filter labels, DonationCard badges, TransferCard labels, date formatters
7. `src/modules/chat/components/RedEnvelopeDialog.tsx` — "Tạo Lì Xì", "Token", "Tổng số tiền", "Số lượng lì xì", "Hủy", "Đang tạo...", "Tạo Lì Xì"
8. `src/modules/chat/components/RedEnvelopeClaimDialog.tsx` — "Lì Xì", "Còn X/Y lì xì", "Lì xì đã hết hạn", "Đã hết lì xì", "Mở Lì Xì"
9. `src/modules/chat/components/ReportDialog.tsx` — "Phản hồi vi phạm", reason labels, "Mô tả thêm", "Hủy", "Đang gửi...", "Gửi phản hồi"

### Lưu ý kỹ thuật
- `GiftHistoryCalendar` dùng `memo` — cần truyền `t` qua hoặc dùng `useLanguage()` bên trong
- `DAY_NAMES` cần chuyển thành hàm dynamic dựa trên language
- Date format `{ locale: vi }` cần thay bằng dynamic locale
- `STEP_CONFIG` trong UnifiedGiftSendDialog là const — cần chuyển thành function nhận `t`
- `toLocaleString('vi-VN')` → `toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')`

