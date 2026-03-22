

## Đồng bộ ngôn ngữ toàn hệ thống - Đợt 2-5: Cập nhật component files

### Phạm vi
78+ component files chứa chuỗi tiếng Việt hardcode cần chuyển sang dùng `t()`. Chia thành 4 đợt thực hiện tuần tự.

### Đợt 2: Wallet & Transaction (~12 files)
Các file cần sửa — thêm `import { useLanguage }` (nếu chưa có), gọi `const { t } = useLanguage()`, thay thế tất cả chuỗi hardcode:

| File | Chuỗi cần thay |
|------|----------------|
| `HistoryTab.tsx` | "Thành công", "Đang xử lý", "Lỗi", "Đã tặng", "Đã nhận", "Ví ngoài", "Thu gọn", "Xem thêm", "Tất cả", "Từ ngày", "Đến ngày", "Tải thêm", "Lịch sử giao dịch cá nhân", "Tổng nhận", "Tổng đã tặng", "Lệnh", "Nhận:", "Gửi:", "Tổng: X GD", "Chưa có giao dịch nào", "Không có giao dịch nào", "Xem Tất Cả Giao Dịch", "Xem biên nhận" |
| `WalletTransactionHistory.tsx` | Same set + "Lịch sử GD", "Chuyển vào", "Chuyển ra", "Từ:", "Đến:" |
| `FunMoneyGuide.tsx` | 5 steps titles+descriptions, "Hướng Dẫn Mint FUN Money", tip text |
| `ClaimFunDialog.tsx` | "Đã nhận thành công" |
| `DonationReceivedCard.tsx` | All Vietnamese labels in receipt card |
| `DonationHistoryTab.tsx` | Filter labels, status badges |
| `FunBalanceCard.tsx` | Any hardcoded text |
| `RecentTransactions.tsx` | Already uses `t()` — verify complete |
| `SwapTab.tsx` | Any hardcoded Vietnamese |
| `TokenSelector.tsx` | "Chưa có" |

Also update `formatDateVN`/`formatTimeVN` functions to use locale from language context instead of hardcoded `'vi-VN'`.

### Đợt 3: Donations/Gift (~8 files)
| File | Chuỗi cần thay |
|------|----------------|
| `DonationCelebration.tsx` | Celebration text |
| `DonationSuccessCard.tsx` | Success messages |
| `GiftConfirmStep.tsx` | Confirmation labels |
| `UnifiedGiftSendDialog.tsx` | All dialog text |
| `GiftHistoryCalendar.tsx` | Calendar labels |
| `SystemDonationHistory.tsx` | History labels |
| `GiftCelebrationCard.tsx` | Celebration text |

### Đợt 4: Auth, Security, Chat, Friends (~12 files)
| File | Chuỗi cần thay |
|------|----------------|
| `LinkWalletDialog.tsx` | "Chưa đăng nhập", "Liên kết ví thành công!", "Bạn đã từ chối ký", toast messages, all dialog labels |
| `LinkEmailDialog.tsx` | Similar auth labels |
| `FriendsList.tsx` | "Chưa có bạn bè", "Không có lời mời nào", etc. |
| `FriendRequestButton.tsx` | Already uses t() — verify |
| `AngelChatWidget.tsx` | "Xóa lịch sử chat" |
| `UserDirectoryFilters.tsx` | All select labels: "Tất cả điểm", "Cao", "TB", "Thấp", etc. |
| `useNotifications.ts` | Toast messages |

### Đợt 5: Admin & Pages (~28 files)
All files in `src/components/admin/` — plus pages like `Friends.tsx`, `Users.tsx`, `LawOfLight.tsx`, `PlatformDocs.tsx`.

### Cách thêm translation keys mới
Mỗi đợt sẽ bổ sung keys vào `translations.ts` trước khi cập nhật components. Keys theo convention hiện tại: camelCase, prefix theo nhóm (wallet*, donation*, auth*, friend*, admin*).

### Ưu tiên
- Đợt 2 + 3 (user-facing) trước
- Đợt 4 (auth/chat/friends) tiếp
- Đợt 5 (admin) cuối cùng — ít user thấy nhất

### Lưu ý kỹ thuật
- Locale formatting (`toLocaleDateString`, `toLocaleString`) cần dynamic: dùng `language === 'vi' ? 'vi-VN' : 'en-US'`
- Toast messages cũng phải dùng `t()`
- `confirm()` dialogs trong admin cần translate
- Hooks (.ts files) không dùng được hooks — sẽ truyền translated strings qua params hoặc dùng hàm `getTranslation(language, key)` utility

