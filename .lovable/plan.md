

## Sửa lỗi ngôn ngữ không thay đổi theo lựa chọn của user

### Vấn đề phát hiện

Có **2 loại lỗi chính** khiến giao diện luôn hiển thị tiếng Việt dù user chọn ngôn ngữ khác:

**Lỗi 1 — Hardcoded Vietnamese strings (~28 file):** Rất nhiều chuỗi tiếng Việt viết trực tiếp trong code, không dùng hệ thống `t()`. Ví dụ:
- `"Gift Celebration"`, `"đã trao gửi"`, `"đã nhận thưởng"`, `"Xem giao dịch"` trong GiftCelebrationCard
- `"Thu gọn"`, `"Xem thêm"` trong nhiều component
- `"Chưa có bạn bè"`, `"Chưa có dữ liệu cộng đồng"`, `"Chưa có ai bày tỏ cảm xúc"` 
- `"Hiển thị"`, `"Kết nối"`, `"Cập nhật"` trong wallet/settings
- Emoji picker categories: `"Cảm xúc"`, `"Cử chỉ"`, `"Trái tim"`

**Lỗi 2 — date-fns luôn dùng `locale: vi` (~19 file):** Tất cả `formatDistanceToNow` và `format` đều hardcode `locale: vi`, nên thời gian luôn hiện "khoảng 2 giờ trước" thay vì "about 2 hours ago" khi chọn English.

### Giải pháp

#### Bước 1: Tạo hook `useDateLocale` để tự động chọn locale theo ngôn ngữ
**File mới:** `src/hooks/useDateLocale.ts`
- Import các locale từ `date-fns/locale` (vi, en-US, ja, ko, zh-CN, ...)
- Trả về locale object tương ứng với `language` hiện tại từ `useLanguage()`

#### Bước 2: Thêm translation keys vào `src/i18n/translations.ts`
Thêm các key còn thiếu cho tất cả 13 ngôn ngữ (ưu tiên EN + VI, các ngôn ngữ khác fallback EN):
- `giftCelebration`, `giftSent`, `giftReceived`, `viewTransaction`
- `collapse`, `showMore`, `noFriendsYet`, `noDataYet`, `noReactionsYet`
- `noCommunityData`, `display`, `showBalance`, `connected`, `lastActive`
- Emoji categories: `emojiSmileys`, `emojiGestures`, `emojiHearts`, ...

#### Bước 3: Cập nhật các component (ưu tiên cao — user-facing)
Danh sách file cần sửa, nhóm theo mức ưu tiên:

**Feed (người dùng thấy hàng ngày):**
- `GiftCelebrationCard.tsx` — đổi hardcoded text + locale sang `t()` + `useDateLocale()`
- `GiftCelebrationGroup.tsx` — "Hôm nay chưa có gift", "Xem thêm", "Thu gọn"
- `TopRanking.tsx` — "Chưa có dữ liệu cộng đồng"
- `ReactionViewerDialog.tsx` — "Chưa có ai bày tỏ cảm xúc"
- `EmojiPicker.tsx` — category names
- `MediaUploadPreview.tsx` — "Hiển thị 12/N file"
- `PostHeader.tsx` — locale trong formatDistanceToNow
- `FriendTagDialog.tsx` — "Chưa có bạn bè nào"

**Wallet / Profile:**
- `DonationHistoryItem.tsx` — "Xem giao dịch"
- `WalletSettingsDialog.tsx` — "Hiển thị", "Hiển thị số dư"
- `RecentTransactions.tsx` — locale
- `WalletTransactionHistory.tsx` — "Thu gọn", "Xem thêm"
- `ProfilePosts.tsx` — "Xem thêm (N bài còn lại)"

**Chat:**
- `ConversationList.tsx` — locale
- `MessageBubble.tsx` — locale
- `MessageSearch.tsx` — locale
- `NewConversationDialog.tsx` — "Bạn chưa có bạn bè nào"

**Friends:**
- `FriendsList.tsx` — "Chưa có bạn bè"

**Notifications / Others:**
- `Notifications.tsx` — locale
- `ConnectedApps.tsx` — "Kết nối:", "Hoạt động:", "Cập nhật:", locale
- `NotificationItem.tsx` — locale

**Giữ nguyên (admin-only, không cần i18n):**
- `PplpMintTab.tsx`, `WalletAbuseTab.tsx`, `QuickDeleteTab.tsx`, `SystemTab.tsx` — chỉ admin thấy

#### Bước 4: Sửa edge function `record-donation`
- File: `supabase/functions/record-donation/index.ts`
- Chuỗi `"đã trao gửi"` trong post content được tạo server-side → giữ nguyên tiếng Việt (vì là nội dung feed chung)

### Quy mô
- ~1 file mới (hook)
- ~1 file cập nhật lớn (translations.ts — thêm ~30 keys × 2 ngôn ngữ chính)
- ~20 file component cần sửa (chủ yếu thay string → `t(key)` và `locale: vi` → `locale: dateLocale`)

### Kết quả
- Toàn bộ giao diện user-facing hiển thị đúng ngôn ngữ đã chọn
- Thời gian tương đối ("2 giờ trước" / "2 hours ago") theo ngôn ngữ
- Desktop và mobile đều nhất quán

