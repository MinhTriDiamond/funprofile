
# Quốc Tế Hóa (i18n) Toàn Bộ Trang Wallet

## Vấn Đề

Trang Wallet hiện có rất nhiều chuỗi văn bản được viết cứng (hardcoded) bằng tiếng Việt hoặc tiếng Anh, không sử dụng hệ thống dịch `t()` từ `useLanguage()`. Khi người dùng chuyển ngôn ngữ, các chuỗi này không thay đổi.

## Phạm Vi Thay Đổi

### 10 file component cần cập nhật:

| File | Số chuỗi cần dịch | Ví dụ |
|------|-------------------|-------|
| `WalletCenterContainer.tsx` | ~25 | "My Wallet", "Kết nối ví để tiếp tục", toast messages, status labels |
| `WalletCard.tsx` | ~12 | "Total Assets", "Receive", "Send", "Swap", "Buy", "Connected", "Custodial" |
| `RewardBreakdown.tsx` | ~12 | "Chi Tiết Thưởng Của Bạn", "TỔNG THƯỞNG", "Đã claim", action labels |
| `RewardFormulaCard.tsx` | ~15 | "Công Thức Tính Thưởng CAMLY", table headers, all action rows |
| `FunBalanceCard.tsx` | ~8 | "FUN Money Balance", "LOCKED", "ACTIVATED", "Tiến độ Activate" |
| `ClaimRewardsCard.tsx` | ~10 | "Light Actions Chờ Claim", "Tổng cộng", action labels |
| `LightScoreDashboard.tsx` | ~15 | Pillar names, "Hôm nay", "Light Actions Gần Đây" |
| `DonationHistoryTab.tsx` | ~8 | "Lịch Sử Tặng Thưởng", "Đã gửi", "Đã nhận" |
| `RecentTransactions.tsx` | ~5 | "Lịch sử giao dịch", status badges |
| `ReceiveTab.tsx` | ~5 | "Nhận tiền", "Copy địa chỉ", "Chia sẻ" |

### 1 file translation cần bổ sung:
| File | Thay đổi |
|------|----------|
| `src/i18n/translations.ts` | Thêm ~100 translation keys mới cho phần Wallet vào tất cả 13 ngôn ngữ (en, vi, zh, ja, ko, th, id, fr, es, de, pt, ru, ar) |

## Cách Thực Hiện

### Buoc 1: Thêm translation keys mới vào `translations.ts`

Thêm các nhóm key mới trong phần Wallet cho mỗi ngôn ngữ:

**Nhóm keys mới (ví dụ EN/VI):**
- `walletMyWallet`: "My Wallet" / "Ví Của Tôi"
- `walletConnectToContinue`: "Connect wallet to continue" / "Kết nối ví để tiếp tục"  
- `walletConnectDesc`: "Connect your wallet..." / "Kết nối ví của bạn..."
- `walletTotalAssets`: "Total Assets" / "Tổng Tài Sản"
- `walletReceive`: "Receive" / "Nhận"
- `walletSend`: "Send" / "Gửi"
- `walletSwap`: "Swap" / "Hoán Đổi"
- `walletBuy`: "Buy" / "Mua"
- `walletConnected`: "Connected" / "Đã kết nối"
- `walletNotConnected`: "Not Connected" / "Chưa kết nối"
- `walletCustodial`: "Custodial" / "Ví lưu ký"
- `walletDisconnect`: "Disconnect" / "Ngắt kết nối"
- `walletRefresh`: "Refresh" / "Làm mới"
- `walletLoading`: "Loading..." / "Đang tải..."
- `walletNoWallet`: "No wallet" / "Chưa có ví"
- `walletCopied`: "Address copied" / "Đã copy địa chỉ ví"
- `walletDisconnected`: "Wallet disconnected" / "Đã ngắt kết nối ví"
- `walletSwitchedTestnet`: "Switched to BSC Testnet" / "Đã chuyển sang BSC Testnet"
- `walletSwitchedMainnet`: "Switched to BNB Mainnet" / "Đã chuyển sang BNB Mainnet"
- `walletCannotSwitch`: "Cannot switch network" / "Không thể chuyển network"
- `walletTestnetWarning`: "You are on BSC Testnet..." / "Bạn đang ở BSC Testnet..."
- `walletPendingApproval`: "Pending approval" / "Đang chờ duyệt"
- `walletReadyToClaim`: "Ready to claim" / "Sẵn sàng Claim"
- `walletOnHold`: "On hold" / "Đang treo"
- `walletRejected`: "Rejected" / "Đã từ chối"
- `walletClaimToWallet`: "Claim to Wallet" / "Claim về Ví"
- `walletStatus`: "Status" / "Trạng thái"
- `walletAdminNotes`: "Notes from Admin" / "Ghi chú từ Admin"
- `walletRewardDetails`: "Your Reward Details" / "Chi Tiết Thưởng Của Bạn"
- `walletSignupBonus`: "Signup bonus" / "Bonus đăng ký"
- `walletCreatePost`: "Create post" / "Đăng bài"
- `walletReceiveReaction`: "Receive reaction" / "Nhận reaction"
- `walletReceiveComment`: "Receive comment" / "Nhận comment"
- `walletGetShared`: "Get shared" / "Được share"
- `walletMakeFriend`: "Make friend" / "Kết bạn"
- `walletLivestream`: "Livestream" / "Phát trực tiếp"
- `walletOnce`: "once" / "1 lần"
- `walletTotalReward`: "TOTAL REWARD" / "TỔNG THƯỞNG"
- `walletClaimed`: "Claimed" / "Đã claim"
- `walletClaimable`: "Claimable" / "Còn claim được"
- `walletToday`: "Today" / "Hôm nay"
- `walletDailyCapNote`: "Total rewards applied daily cap..." / "Tổng thưởng đã áp dụng giới hạn..."
- `walletRewardFormula`: "CAMLY Reward Formula" / "Công Thức Tính Thưởng CAMLY"
- `walletAction`: "Action" / "Hành động"
- `walletRewardPerTime`: "Reward/time" / "Thưởng/lần"
- `walletDailyLimit`: "Daily limit" / "Giới hạn/ngày"
- `walletMaxDaily`: "Max daily" / "Tối đa/ngày"
- `walletMaxDailyTotal`: "Max daily total" / "Tổng thưởng tối đa/ngày"
- `walletFunBalance`: "FUN Money Balance" / "Số Dư FUN Money"
- `walletConnectToView`: "Connect wallet to view FUN Balance" / "Kết nối ví để xem FUN Balance"
- `walletLocked`: "LOCKED" / "KHÓA"
- `walletActivated`: "ACTIVATED" / "ĐÃ KÍCH HOẠT"
- `walletTotal`: "TOTAL" / "TỔNG"
- `walletActivateProgress`: "Activate progress" / "Tiến độ Activate"
- `walletActivateFun`: "Activate FUN" / "Kích hoạt FUN"
- `walletClaimFun`: "Claim FUN" / "Nhận FUN"
- `walletLightActionsWaiting`: "Light Actions Waiting" / "Light Actions Chờ Claim"
- `walletLoadingActions`: "Loading Light Actions..." / "Đang tải Light Actions..."
- `walletNoActions`: "No Light Actions yet" / "Chưa có Light Actions nào"
- `walletNoActionsDesc`: "Create posts, comment..." / "Tạo bài viết, bình luận..."
- `walletTotalSum`: "Total" / "Tổng cộng"
- `walletProcessing`: "Processing..." / "Đang xử lý..."
- `walletAfterClaim`: "After claim, Admin will sign..." / "Sau khi claim, Admin sẽ ký..."
- `walletOtherActions`: "other actions" / "actions khác"
- `walletLightScore`: "LIGHT SCORE" / "ĐIỂM ÁNH SÁNG"
- `walletPointsToNext`: "points to reach" / "điểm để đạt"
- `wallet5Pillars`: "5 Pillars of Light" / "5 Trụ Cột Ánh Sáng"
- `walletFunMoney`: "FUN Money" / "FUN Money"
- `walletTotalMinted`: "Total Minted" / "Đã Mint"
- `walletPending`: "Pending" / "Đang chờ"
- `walletSetupWallet`: "Setup wallet to receive FUN" / "Thiết lập ví để nhận FUN Money"
- `walletNeedConnect`: "Need to connect wallet to claim..." / "Bạn cần kết nối ví Web3 để claim..."
- `walletSetupNow`: "Setup wallet now" / "Thiết lập ví ngay"
- `walletMinting`: "Minting..." / "Đang mint..."
- `walletCheckingWallet`: "Checking wallet..." / "Đang kiểm tra ví..."
- `walletRecentActions`: "Recent Light Actions" / "Light Actions Gần Đây"
- `walletNoActivity`: "No activity yet..." / "Chưa có hoạt động nào..."
- `walletCannotLoadScore`: "Cannot load Light Score" / "Không thể tải Light Score"
- `walletRetry`: "Retry" / "Thử lại"
- `walletDonationHistory`: "Gift History" / "Lịch Sử Tặng Thưởng"
- `walletExportCsv`: "Export CSV" / "Xuất CSV"
- `walletSent`: "Sent" / "Đã gửi"
- `walletReceived`: "Received" / "Đã nhận"
- `walletTimes`: "times" / "lần"
- `walletNoGiftSent`: "You haven't sent any gifts" / "Bạn chưa tặng quà cho ai"
- `walletNoGiftReceived`: "You haven't received any gifts" / "Bạn chưa nhận được quà nào"
- `walletTransactionHistory`: "Transaction History" / "Lịch sử giao dịch"
- `walletConfirmed`: "Confirmed" / "Đã xác nhận"
- `walletFailed`: "Failed" / "Thất bại"
- `walletReceiveMoney`: "Receive Money" / "Nhận tiền"
- `walletYourAddress`: "Your wallet address" / "Địa chỉ ví của bạn"
- `walletCopyAddress`: "Copy address" / "Copy địa chỉ"
- `walletShareAddress`: "Share" / "Chia sẻ"
- `walletScanQr`: "Scan QR or copy address to receive" / "Quét mã QR hoặc copy địa chỉ để nhận tiền"
- `walletViewAll`: "View all" / "Xem tất cả"
- `walletNoData`: "No data to export" / "Không có dữ liệu để xuất"
- `walletExported`: "Exported records to CSV" / "Đã xuất records ra file CSV"

(Plus the same keys translated into zh, ja, ko, th, id, fr, es, de, pt, ru, ar)

### Buoc 2: Cập nhật từng component

Mỗi component sẽ:
1. Import `useLanguage` từ `@/i18n/LanguageContext`
2. Gọi `const { t } = useLanguage()`
3. Thay thế tất cả chuỗi hardcoded bằng `t('walletXxx')`

**Ví dụ thay đổi trong WalletCard.tsx:**
```text
// Truoc:
<span className="text-xs font-medium text-gray-600">Receive</span>

// Sau:
<span className="text-xs font-medium text-gray-600">{t('walletReceive')}</span>
```

**Ví dụ thay đổi trong WalletCenterContainer.tsx:**
```text
// Truoc:
<h1 className="text-xl font-bold text-gray-900">My Wallet</h1>
toast.success('Đã ngắt kết nối ví');

// Sau:
<h1 className="text-xl font-bold text-gray-900">{t('walletMyWallet')}</h1>
toast.success(t('walletDisconnected'));
```

### Buoc 3: Danh sách chi tiết thay đổi theo component

**WalletCenterContainer.tsx** (~25 strings):
- "My Wallet", "Kết nối ví để tiếp tục", connect/disconnect toasts, status labels (Đang chờ duyệt, Sẵn sàng Claim, etc.), "Claim to Wallet", "Nhận tiền", testnet warning, admin notes

**WalletCard.tsx** (~12 strings):
- "Total Assets", "Receive", "Send", "Swap", "Buy", "Custodial", "Connected", "Not Connected", "Connect Wallet", "Disconnect", "Tokens", "Refresh", loading text

**RewardBreakdown.tsx** (~12 strings):
- Title, action labels (Đăng bài, Nhận reaction...), "Bonus đăng ký", "1 lần", "TỔNG THƯỞNG", "Đã claim", "Còn claim được", "Hôm nay", daily cap note

**RewardFormulaCard.tsx** (~15 strings):
- Title, table headers (Hành động, Thưởng/lần, Giới hạn/ngày, Tối đa/ngày), all action rows, daily total, info note

**FunBalanceCard.tsx** (~8 strings):
- Title, "Kết nối ví để xem FUN Balance", "LOCKED", "ACTIVATED", "TỔNG", "Tiến độ Activate", "Activate FUN", "Claim FUN"

**ClaimRewardsCard.tsx** (~10 strings):
- Title, action labels, "Tổng cộng", "Đang xử lý...", "Đang tải Light Actions...", empty state text, claim note

**LightScoreDashboard.tsx** (~15 strings):
- Pillar names, action labels, "LIGHT SCORE", "Hôm nay", "Total Minted", "Pending", wallet warning, claim button, "Light Actions Gần Đây", empty state

**DonationHistoryTab.tsx** (~8 strings):
- Title, "Đã gửi", "Đã nhận", "Xuất CSV", "Xem tất cả", empty states

**RecentTransactions.tsx** (~5 strings):
- Title, "Refresh", "Đang tải...", status badges (Confirmed, Failed, Pending)

**ReceiveTab.tsx** (~5 strings):
- "Nhận tiền", "Địa chỉ ví của bạn", "Copy địa chỉ", "Chia sẻ", QR instruction

## Khong Can Thay Doi Database

Tất cả thay đổi chỉ ở phía frontend. Không cần migration hay thay đổi backend.
