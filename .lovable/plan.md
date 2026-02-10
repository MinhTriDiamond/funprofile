
# Nâng Cấp Flow Tặng & Thưởng Trên FUN Profile

## Tổng Quan

Xây dựng lại flow tặng quà 3 bước hoàn chỉnh: SendGift Modal (điền thông tin) -> Xác nhận & Ký MetaMask -> Gift Celebration Modal (Card chúc mừng tùy chỉnh) với chủ đề, nhạc MP3, hiệu ứng, auto post profile và gửi tin nhắn.

## Phạm Vi Thay Đổi

### Giai đoạn 1: Chuẩn Bị Tài Nguyên & Database

**1a. Copy 3 file nhạc MP3 vào project**
- `public/sounds/rich-1.mp3` (Rich bản 1 - mặc định)
- `public/sounds/rich-2.mp3` (Rich bản 2)
- `public/sounds/rich-3.mp3` (Rich bản 3)

**1b. Database Migration** -- Thêm cột vào bảng `donations`:
```sql
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS card_theme text DEFAULT 'celebration',
  ADD COLUMN IF NOT EXISTS card_background text,
  ADD COLUMN IF NOT EXISTS card_sound text DEFAULT 'rich-1';
```
Lưu theme + background + sound đã chọn để khi xem lại lịch sử, hiển thị đúng card gốc.

### Giai đoạn 2: Refactor UnifiedGiftSendDialog Thành 3 Bước

Hiện tại dialog gộp tất cả vào 1 màn hình. Sẽ tách thành 3 bước rõ ràng bằng state `step`:

**Bước 1 -- Điền Thông Tin (`step = 'form'`)**
- Hiển thị người gửi: Avatar + username + ví rút gọn + COPY
- Tìm/chọn người nhận (giữ nguyên logic search hiện có)
- Token mặc định: CAMLY. Các mức nhanh: 10, 50, 100, 500 (không slider)
- Ô nhập số tùy chỉnh
- Lời nhắn yêu thương (textarea + emoji picker)
- Nút: "Xem lại & Xác nhận" (chuyển sang step 2)
- LOAI BO hoàn toàn thanh kéo slider (hiện tại không có slider, OK)
- KHÔNG chọn chủ đề / nhạc ở bước này

**Bước 2 -- Xác Nhận & Ký MetaMask (`step = 'confirm'`)**
- Bảng xác nhận đầy đủ:
  - Avatar + tên người gửi (link profile) + ví rút gọn + COPY
  - Arrow -> Số lượng + Token -> Arrow
  - Avatar + tên người nhận (link profile) + ví rút gọn + COPY
  - Lời nhắn
  - Chain: BSC
  - Cảnh báo: "Giao dịch blockchain không thể hoàn tác"
- Nút: "Quay lại" | "Xac nhận & Tặng" (mở MetaMask)
- Progress bar khi đang ký/broadcast/confirm
- Sau khi on-chain SUCCESS -> chuyển sang step 3

**Bước 3 -- Gift Celebration Modal (`step = 'celebration'`)**
- Thay thế `DonationSuccessCard` hiện tại bằng phiên bản mới, mạnh mẽ hơn
- Chi tiết ở Giai đoạn 3

### Giai đoạn 3: Gift Celebration Modal Mới

**File mới: `src/components/donations/GiftCelebrationModal.tsx`**

Nội dung card đầy đủ:
- Tiêu đề: "CHUC MUNG TANG THUONG THANH CONG"
- Avatar + tên người gửi (link profile) + ví rút gọn + COPY
- Arrow -> Số lượng Token
- Avatar + tên người nhận (link profile) + ví rút gọn + COPY
- Lời nhắn
- Thời gian
- Chain: BSC
- Tx Hash (rút gọn + COPY + mở BscScan)
- Light Score earned

**Chọn chủ đề card (6 chủ đề):**

| ID | Tên | Emoji | Màu chính |
|----|-----|-------|-----------|
| `celebration` | Chúc mừng | 🎉 | Gold/Amber (giữ style hiện tại) |
| `gratitude` | Tri ân | 🙏 | Emerald/Green |
| `birthday` | Sinh nhật | 🎂 | Pink/Rose |
| `love` | Tình yêu | ❤️ | Red/Rose |
| `newyear` | Năm mới | 🎊 | Red/Gold |
| `family` | Gia đình | 👨‍👩‍👧‍👦 | Blue/Indigo |

Mỗi chủ đề có:
- 3 gradient background mặc định
- User có thể chọn 1 trong 3 hoặc upload ảnh riêng làm background
- Màu text/border thay đổi theo theme

**Âm thanh (3 bản nhạc MP3):**
- Rich! Rich! Rich! (bản 1 - mặc định) -- `rich-1.mp3`
- Rich! Rich! Rich! (bản 2) -- `rich-2.mp3`
- Rich! Rich! Rich! (bản 3) -- `rich-3.mp3`
- Nút play/preview cho mỗi bản trước khi chọn
- Thay thế Web Audio API celebration sounds bằng MP3

**Hiệu ứng:**
- Giữ nguyên pháo hoa (canvas-confetti) từ `DonationCelebration`
- Giữ đồng coin rơi + sparkle effects
- Nhẹ, đẹp, không che nội dung

**Nút trên card:**
- Lưu hình ảnh (html2canvas -- giữ nguyên logic)
- Chia sẻ (copy link card)
- Sao chép Tx Hash
- Đăng lên Profile
- Gửi tin nhắn cho người nhận
- Đóng

### Giai đoạn 4: Auto Post Profile

**Khi user nhấn "Đăng lên Profile":**
- Gọi edge function `create-post` với:
  - Content: Template text + hashtag (ví dụ: "🎁 Đã tặng 100 CAMLY cho @username! #FUNProfile #ManhThuongQuan")
  - Không dùng GIF ngẫu nhiên
  - Lưu `donation_id` reference trong post metadata
- Toast xác nhận "Đã đăng lên trang cá nhân!"

### Giai đoạn 5: Auto Message Người Nhận

Hiện tại `record-donation` edge function đã tự động gửi tin nhắn chat. Sẽ cải thiện:
- Nội dung tin nhắn bao gồm đầy đủ thông tin card
- Thêm metadata `donation_id` để người nhận click "Xem Card Chúc Mừng"

### Giai đoạn 6: Xem Lại Card Từ Lịch Sử

Cập nhật `DonationHistoryTab` và `DonationHistoryItem`:
- Thay nút mở `DonationSuccessCard` cũ bằng `GiftCelebrationModal` mới
- Load `card_theme`, `card_background`, `card_sound` từ donation record
- Phát đúng theme + nhạc + hiệu ứng khi xem lại

## Danh Sách Files

| File | Hành động | Mô tả |
|------|-----------|-------|
| `public/sounds/rich-1.mp3` | **Copy** | File nhạc Rich bản 1 |
| `public/sounds/rich-2.mp3` | **Copy** | File nhạc Rich bản 2 |
| `public/sounds/rich-3.mp3` | **Copy** | File nhạc Rich bản 3 |
| Migration SQL | **Tạo** | Thêm card_theme, card_background, card_sound vào donations |
| `src/components/donations/GiftCelebrationModal.tsx` | **Tạo mới** | Celebration Card mới với theme/nhạc/hiệu ứng |
| `src/components/donations/CardThemeSelector.tsx` | **Tạo mới** | UI chọn chủ đề + background |
| `src/components/donations/CardSoundSelector.tsx` | **Tạo mới** | UI chọn nhạc + preview |
| `src/lib/celebrationSounds.ts` | **Cập nhật** | Thêm function phát MP3 thay vì chỉ Web Audio |
| `src/components/donations/UnifiedGiftSendDialog.tsx` | **Refactor lớn** | Tách thành 3 bước: form -> confirm -> celebration |
| `src/components/donations/DonationSuccessCard.tsx` | **Giữ/Deprecated** | Thay thế bởi GiftCelebrationModal |
| `src/components/wallet/DonationHistoryTab.tsx` | **Cập nhật** | Dùng GiftCelebrationModal thay DonationSuccessCard |
| `src/components/wallet/DonationHistoryItem.tsx` | **Cập nhật** | Thêm nút "Xem Card Chúc Mừng" |
| `supabase/functions/record-donation/index.ts` | **Cập nhật** | Nhận thêm card_theme, card_sound; cải thiện tin nhắn |

## Chi Tiết Kỹ Thuật

### State Machine cho UnifiedGiftSendDialog

```text
step: 'form' --> 'confirm' --> 'signing' --> 'celebration'
                    |                            |
                    v                            v
                 'form' (quay lại)          (đóng/đăng/gửi)
```

### CardThemeSelector -- 6 chủ đề x 3 background

Mỗi theme là 1 object:
```typescript
interface CardTheme {
  id: string;
  name: string;
  emoji: string;
  backgrounds: string[]; // 3 CSS gradient strings
  textColor: string;
  borderColor: string;
  accentColor: string;
}
```

User chọn theme -> chọn 1 trong 3 background hoặc upload ảnh.
Upload ảnh dùng Supabase Storage hoặc R2 (tùy cấu hình hiện có).

### Phát Nhạc MP3

```typescript
// Thay thế playCelebrationSounds
export const playCelebrationMusic = (soundId: string = 'rich-1') => {
  const audio = new Audio(`/sounds/${soundId}.mp3`);
  audio.volume = 0.7;
  audio.play().catch(() => {});
  return audio; // Return để có thể stop khi đóng modal
};
```

### Auto Post khi nhấn "Đăng lên Profile"

Gọi trực tiếp edge function `create-post`:
```typescript
const autoPostDonation = async (data: DonationCardData) => {
  const session = await supabase.auth.getSession();
  const content = `🎁 Đã tặng ${data.amount} ${data.tokenSymbol} cho @${data.recipientUsername}!\n\n"${data.message || ''}"\n\n#FUNProfile #ManhThuongQuan #TangThuong`;
  
  await supabase.functions.invoke('create-post', {
    body: {
      content,
      media_urls: [], // Card image nếu cần
      visibility: 'public',
    },
  });
};
```

### Responsive

- Desktop: Modal max-w-2xl, card content rộng rãi, theme selector grid 3x2
- Mobile: max-w-md, theme selector grid 2x3, nút cuộn ngang
- Tất cả button wrap trên mobile

### Lưu Ý Quan Trọng

1. Token mặc định đổi từ FUN sang CAMLY (thay đổi `useState<TokenOption>(SUPPORTED_TOKENS[0])` -> tìm CAMLY)
2. Bước 1 hiển thị thông tin người gửi (hiện tại chưa có) -- cần fetch sender profile
3. Giữ nguyên toàn bộ logic giao dịch blockchain (useSendToken) -- chỉ thay đổi UI flow
4. Giữ nguyên validation min send $0.01
5. Celebration Card lưu theme/sound vào DB để xem lại đúng format
