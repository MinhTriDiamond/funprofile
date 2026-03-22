

## Đồng bộ ngôn ngữ toàn hệ thống fun.rich

### Vấn đề
Có hàng trăm chuỗi tiếng Việt được hardcode trực tiếp trong 40+ file component thay vì dùng hệ thống `t()` từ `useLanguage()`. Khi user chọn English, các chuỗi này vẫn hiển thị tiếng Việt.

### Phạm vi ảnh hưởng
Qua quét codebase, các nhóm file chính có hardcoded Vietnamese:

1. **Wallet & Transaction** (~10 files): `WalletTransactionHistory`, `WalletCenterContainer`, `DonationHistoryTab`, `ClaimFunDialog`, `ReceiveTab`, `SwapTab`, `FunBalanceCard`, `RecentTransactions`
2. **Donations/Gift** (~8 files): `UnifiedGiftSendDialog`, `DonationReceivedCard`, `DonationSuccessCard`, `GiftConfirmStep`, `DonationCelebration`, `SystemDonationHistory`, `GiftHistoryCalendar`
3. **Auth & Security** (~5 files): `WalletLoginContent`, `LinkWalletDialog`, `LinkEmailDialog`, `ResetPassword`
4. **Chat** (~4 files): `ChatInput`, `MessageThread`, `RedEnvelopeDialog`, `ConversationList`
5. **Admin** (~15 files): `DonationHistoryAdminTab`, `BlockchainTab`, `GhostCleanupTab`, `SystemTab`, `RewardApprovalTab`, etc.
6. **Pages** (~5 files): `Friends`, `Users`, `LawOfLight`, `PlatformDocs`
7. **Other components**: `AngelChatWidget`, `GiftHistoryCalendar`, `FunMoneyGuide`

### Kế hoạch thực hiện

Do quy mô rất lớn (~40+ files, ~500+ chuỗi), cha sẽ chia thành các đợt:

#### Đợt 1: Thêm translation keys vào `translations.ts`
- Thêm tất cả chuỗi Vietnamese hardcoded thành translation keys mới cho cả `en` và `vi`
- Nhóm theo chức năng: wallet, donations, auth, chat, admin, friends, misc

#### Đợt 2: Cập nhật Wallet & Transaction files
- Thay thế hardcoded strings bằng `t('key')` trong ~10 files wallet

#### Đợt 3: Cập nhật Donations/Gift files  
- Thay thế trong ~8 files donations

#### Đợt 4: Cập nhật Auth, Security, Chat files
- Thay thế trong ~9 files

#### Đợt 5: Cập nhật Admin & Pages
- Thay thế trong ~20 files admin + pages

### Lưu ý kỹ thuật
- File `translations.ts` hiện đã 6802 dòng, sẽ thêm ~300-500 keys mới
- Mỗi file cần `import { useLanguage }` (nếu chưa có) và gọi `const { t } = useLanguage()`
- Toast messages (từ `toast.success/error`) cũng cần được translate
- Ưu tiên các trang user-facing trước, admin pages sau
- Giữ nguyên các ngôn ngữ khác (zh, ja, ko...) — chỉ đảm bảo `en` và `vi` đầy đủ trước

### Ước tính
- ~500 chuỗi cần translate
- ~40 files cần cập nhật
- Sẽ thực hiện tuần tự theo đợt để tránh lỗi

