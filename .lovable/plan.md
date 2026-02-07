
# 🎁 HỆ THỐNG TẶNG QUÀ & THIỆN NGUYỆN (P2P GIVING SYSTEM)

## 📋 Tổng Quan

Xây dựng hệ thống tặng crypto hoàn chỉnh cho FUN Profile, cho phép user tặng FUN Money, CAMLY Coin và các token khác cho nhau. Hệ thống mang tính biểu tượng, giàu cảm xúc, minh bạch on-chain, và tích hợp sâu vào Light Score.

---

## 🎯 Các Điểm Chạm Giao Diện (UI/UX)

### A. Nút Tặng Quà (Interaction Points)

| Vị trí | Mô tả | Ưu tiên |
|--------|-------|---------|
| Trang Profile | Nút "Tặng Quà" sang trọng cạnh nút "Nhắn tin" và "Kết bạn" | Cao |
| Dưới bài viết | Nút "Give" hoặc icon đồng xu trong action bar (Like, Comment, Share, **Give**) | Cao |
| Trong Chat | Quick action để tặng nhanh trong conversation | Trung bình |

### B. Quy Trình Tặng (Gift Flow)

```text
1. User click "Tặng Quà" 
   ↓
2. Modal Chọn Quà mở ra:
   ┌─────────────────────────────────────────────────────┐
   │ 🎁 Tặng quà cho @username                           │
   ├─────────────────────────────────────────────────────┤
   │ Chọn token:                                         │
   │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
   │ │ 🌟 FUN  │ │ 🪙CAMLY │ │ 💛 BNB  │ │ + Khác  │    │
   │ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
   │                                                     │
   │ Số lượng: [_________100_________] [MAX]            │
   │ ≈ $5.00 USD                                         │
   │                                                     │
   │ Lời nhắn mẫu: (Quick Picks)                        │
   │ ┌────────────┐ ┌────────────┐ ┌────────────┐       │
   │ │ 🙏 Biết ơn │ │ ❤️ Yêu thương│ │ 👏 Ngưỡng mộ│     │
   │ └────────────┘ └────────────┘ └────────────┘       │
   │                                                     │
   │ Hoặc nhập lời nhắn riêng:                          │
   │ ┌─────────────────────────────────────────────────┐│
   │ │ Cảm ơn bạn đã chia sẻ bài viết tuyệt vời!      ││
   │ └─────────────────────────────────────────────────┘│
   │                                                     │
   │ Gửi đến: 0x8661b8...a2ca6                          │
   │                                                     │
   │    [Hủy]         [✨ Gửi Tặng - hiệu ứng phát sáng]│
   └─────────────────────────────────────────────────────┘
   ↓
3. Xác nhận ví (MetaMask/WalletConnect popup)
   ↓
4. Đợi tx confirmed
   ↓
5. Hiển thị Recognition Card + Celebration Effects
```

### C. Màn Hình Vinh Danh (Recognition Card) - Cực Kỳ Quan Trọng

```text
┌─────────────────────────────────────────────────────────────┐
│ ═══════════════════════════════════════════════════════════ │
│                    ✨ 🎉 ✨                                 │
│                                                             │
│     🎁 CHÚC MỪNG TẶNG THƯỞNG THÀNH CÔNG! 🎁               │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              ⭐ 100 FUN Money ⭐                      │ │
│  │                 ≈ $5.00 USD                           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 Người tặng:    @minhtri9999                      │   │
│  │ 🎯 Người nhận:    @dongton                          │   │
│  │ 📝 Lời nhắn:      "Cảm ơn bạn đã chia sẻ!"         │   │
│  │ 🕐 Thời gian:     07/02/2026 08:45:32               │   │
│  │ 🔗 TX Hash:       0x1234...abcd                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ⚡ +1 Light Score được cộng vào hồ sơ của bạn!       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│    [🔗 Xem BSCScan]  [📷 Lưu Hình]  [✕ Đóng]               │
│                                                             │
│ ═══════════════════════════════════════════════════════════ │
└─────────────────────────────────────────────────────────────┘
```

**Thiết kế đặc biệt:**
- Nền gradient vàng kim (Gold) hoặc ánh sáng rực rỡ (Radiant)
- Font sang trọng, spacing rộng rãi
- Card có thể chụp ảnh/screenshot để share
- Lưu trữ vĩnh viễn trong database để xem lại sau

### D. Hiệu Ứng Celebration (KHÔNG TỰ TẮT)

```text
┌────────────────────────────────────────────────────────────┐
│ 🎆 Hiệu ứng:                                                │
│ 1. Pháo hoa (canvas-confetti) - liên tục bắn              │
│ 2. Tiền xu rơi từ trên xuống (Falling Coins animation)    │
│ 3. Sparkles/Glitter effects                                │
│ 4. Rung nhẹ (vibration) khi nhấn "Gửi Tặng"               │
│                                                             │
│ ⚠️ QUAN TRỌNG: Hiệu ứng KHÔNG tự tắt!                      │
│ User phải nhấn "Đóng" để tắt - giữ trọn khoảnh khắc       │
└────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Bảng Mới: `donations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `sender_id` | uuid | FK → profiles.id |
| `recipient_id` | uuid | FK → profiles.id |
| `post_id` | uuid | FK → posts.id (nullable - nếu tặng trên post) |
| `amount` | text | Số tiền (string để tránh precision loss) |
| `amount_usd` | numeric | Giá trị USD tại thời điểm tặng |
| `token_symbol` | text | FUN, CAMLY, BNB... |
| `token_address` | text | Contract address (nullable cho native) |
| `chain_id` | integer | 56 (BSC) hoặc 97 (BSC Testnet) |
| `tx_hash` | text | Transaction hash on-chain |
| `message` | text | Lời nhắn khi tặng |
| `message_template` | text | Template đã chọn (grateful/love/admire) |
| `status` | text | pending/confirmed/failed |
| `light_score_earned` | integer | Điểm Light Score được cộng |
| `light_action_id` | uuid | FK → light_actions.id |
| `conversation_id` | uuid | FK → conversations.id |
| `message_id` | uuid | FK → messages.id |
| `card_viewed_at` | timestamp | Lần xem lại card gần nhất |
| `metadata` | jsonb | Thông tin bổ sung (USD price, block number...) |
| `created_at` | timestamp | Thời điểm tạo |
| `confirmed_at` | timestamp | Thời điểm tx confirmed |

### RLS Policies

```sql
-- Ai cũng có thể xem donations (public leaderboard)
CREATE POLICY "Donations are viewable by everyone"
  ON donations FOR SELECT USING (true);

-- Chỉ authenticated users mới tạo donation
CREATE POLICY "Users can create their own donations"
  ON donations FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Chỉ sender hoặc recipient được update
CREATE POLICY "Sender or recipient can update"
  ON donations FOR UPDATE
  USING (auth.uid() IN (sender_id, recipient_id));
```

### RPC Functions

**1. `get_benefactor_leaderboard`**
```sql
-- Trả về top người tặng
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  total_donated numeric,
  total_donations integer,
  total_light_score integer,
  rank integer
)
```

**2. `get_recipient_leaderboard`**
```sql
-- Trả về top người nhận
```

**3. `get_user_donation_stats`**
```sql
-- Thống kê donation của 1 user
RETURNS TABLE (
  total_sent numeric,
  total_received numeric,
  donations_sent integer,
  donations_received integer,
  light_score_from_donations integer
)
```

**4. `get_donation_history`**
```sql
-- Lịch sử donation với pagination
```

---

## 📁 Files Cần Tạo Mới

| File | Mô tả |
|------|-------|
| `src/components/donations/DonationButton.tsx` | Nút tặng quà (dùng trên Profile & Post) |
| `src/components/donations/DonationDialog.tsx` | Modal chọn token, số tiền, lời nhắn |
| `src/components/donations/DonationSuccessCard.tsx` | Card vinh danh (có thể chụp ảnh) |
| `src/components/donations/DonationCelebration.tsx` | Hiệu ứng pháo hoa, tiền rơi |
| `src/components/donations/DonationMessage.tsx` | Tin nhắn đặc biệt trong chat |
| `src/components/donations/QuickGiftPicker.tsx` | Preset amounts & messages |
| `src/components/donations/TokenSelector.tsx` | Chọn token (FUN, CAMLY, BNB) |
| `src/pages/Benefactors.tsx` | Trang bảng xếp hạng Mạnh Thường Quân |
| `src/hooks/useDonation.ts` | Hook xử lý transfer on-chain |
| `src/hooks/useBenefactorLeaderboard.ts` | Hook lấy data bảng xếp hạng |
| `supabase/functions/record-donation/index.ts` | Edge function ghi nhận + PPLP |

---

## 📁 Files Cần Sửa Đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Profile.tsx` (dòng ~467) | Thêm DonationButton cạnh MessageCircle button |
| `src/components/feed/FacebookPostCard.tsx` (dòng ~440) | Thêm Give button trong action bar |
| `src/components/chat/MessageBubble.tsx` | Render donation message với style đặc biệt |
| `src/hooks/useMessages.ts` | Thêm type check cho donation messages |
| `src/App.tsx` | Thêm route `/benefactors` |
| `src/components/feed/FacebookLeftSidebar.tsx` | Thêm link "Mạnh Thường Quân" |
| `src/config/pplp.ts` | Thêm action type "donate" với rewards |
| `src/i18n/translations.ts` | Thêm translations cho giving system |

---

## 🔧 Technical Implementation

### 1. useDonation Hook

```text
Features:
- Kết nối wagmi để transfer token
- Hỗ trợ: BNB native, FUN Money, CAMLY Coin
- Gọi record-donation edge function sau khi tx confirm
- Error handling với retry logic

Flow:
1. Check auth & wallet connection
2. Validate recipient has wallet address
3. Execute transfer (useSendTransaction hoặc useWriteContract)
4. Wait for tx confirmation
5. Call record-donation edge function
6. Return success với card data
```

### 2. record-donation Edge Function

```text
Inputs:
- sender_id, recipient_id
- amount, token_symbol, token_address
- tx_hash, chain_id
- message, post_id (optional)

Process:
1. Verify tx on BSCScan API
2. Calculate Light Score: 100 FUN = 1 Light Score
3. Create light_action record
4. Insert donation record
5. Create special message in conversation
6. Create notification for recipient
7. Return card_data for display
```

### 3. Light Score Integration

```text
Trong src/config/pplp.ts:

ACTION_TYPE: 'donate'
BASE_REWARD: 50  // Base reward khi donate

Công thức Light Score từ Gemini:
- Cứ mỗi 100 FUN tặng đi = +1 Light Score
- Áp dụng thêm ANGEL AI multipliers (Q, I, K, U)
- Cộng vào total Light Score của profile
```

### 4. DonationMessage trong Chat

```text
Message structure:
{
  type: 'donation',
  content: null,
  metadata: {
    donation_id: uuid,
    amount: '100',
    token_symbol: 'FUN',
    message: 'Cảm ơn bạn!',
    tx_hash: '0x...',
    card_data: {...}
  }
}

Render:
- Background gradient vàng/gold
- Icon đồng xu
- Click để mở lại Recognition Card
- Link BSCScan
```

### 5. canvas-confetti Integration

```text
// Sử dụng thư viện canvas-confetti
import confetti from 'canvas-confetti';

// Pháo hoa liên tục
const fireConfetti = () => {
  const interval = setInterval(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, 300);
  
  return interval; // User phải clear interval khi đóng
};

// Tiền xu rơi - CSS animation
.falling-coins {
  animation: fall 2s ease-in infinite;
}
```

---

## 🎨 UI Mockups

### Profile Page với Donation Button

```text
┌────────────────────────────────────────────────────────────┐
│ [Avatar]  @minhtri9999                                      │
│           1,234 bạn bè • Việt Nam                          │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│ │ ➕ Thêm bạn │ │ 💬 Nhắn tin │ │ 🎁 Tặng Quà (vàng kim) ││
│ └─────────────┘ └─────────────┘ └─────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

### Post Action Bar với Give Button

```text
┌────────────────────────────────────────────────────────────┐
│  ❤️ Thích  │  💬 Bình luận  │  ↗️ Chia sẻ  │  🎁 Tặng    │
└────────────────────────────────────────────────────────────┘
```

### Benefactor Leaderboard Page

```text
┌────────────────────────────────────────────────────────────┐
│  👑 BẢNG VINH DANH MẠNH THƯỜNG QUÂN 👑                     │
├────────────────────────────────────────────────────────────┤
│  [Tặng nhiều nhất] [Nhận nhiều nhất] [Tháng này] [Export] │
├────────────────────────────────────────────────────────────┤
│  🥇 1. @dongton           💰 50,000 FUN  │ 25 lần │ ⭐ 500 │
│  🥈 2. @minhtri9999       💰 35,000 FUN  │ 18 lần │ ⭐ 350 │
│  🥉 3. @huuxuan           💰 20,000 FUN  │ 12 lần │ ⭐ 200 │
│  4. @user4                💰 15,000 FUN  │ 10 lần │ ⭐ 150 │
│  ...                                                        │
├────────────────────────────────────────────────────────────┤
│                     [📥 Xuất CSV]                          │
└────────────────────────────────────────────────────────────┘
```

---

## 🌟 Ý Tưởng Bổ Sung (Premium Features)

### 1. Donation Goals / Fundraising
- User tạo "mục tiêu quyên góp" cho mục đích cụ thể
- Progress bar hiển thị tiến độ
- Tất cả người đóng góp được ghi danh trên card

### 2. Recurring Donations
- Subscription hàng tháng cho creator yêu thích
- Như Patreon nhưng on-chain, trustless

### 3. Donation Badges
- Badge "Top Benefactor" hiển thị trên profile
- Badge theo milestone: 10K, 100K, 1M FUN
- NFT kỷ niệm cho top donors

### 4. Export CSV/Excel
- Admin và user có thể xuất lịch sử
- Bao gồm: sender, recipient, amount, tx_hash, date
- Link BSCScan cho từng transaction

### 5. Donation Matching (Future)
- Sponsor/Admin có thể "match" donations
- Ví dụ: Donate 100 FUN → Sponsor thêm 100 FUN

### 6. Charity Pool Integration
- Option donate vào quỹ từ thiện chung
- Hiển thị trên CoverHonorBoard

### 7. Gamification
- Streak bonus: Donate 7 ngày liên tiếp = +50% Light Score
- First-time bonus: Lần donate đầu tiên = +100 Light Score

---

## 🔐 Security Considerations

| Check | Description |
|-------|-------------|
| Anti-Wash Trading | Phát hiện self-donate hoặc A↔B loops |
| Rate Limiting | Max 20 donations/ngày |
| Minimum Amount | Minimum 10 FUN để tránh spam |
| TX Verification | Verify on-chain trước khi ghi nhận |
| Wallet Blacklist | Block known scam wallets |

---

## 📱 Responsive Design

- **Mobile First**: Dialog full-screen, swipe to dismiss
- **Tablet**: Dialog centered, 500px width
- **Desktop**: Dialog centered, 500px width + sidebar preview

---

## ⏱️ Timeline Dự Kiến

| Phase | Task | Thời gian |
|-------|------|-----------|
| 1 | Database migration (donations table + RPCs) | 15 phút |
| 2 | record-donation Edge Function | 20 phút |
| 3 | DonationDialog + TokenSelector components | 25 phút |
| 4 | DonationButton component | 10 phút |
| 5 | DonationSuccessCard + DonationCelebration | 25 phút |
| 6 | useDonation hook với wagmi integration | 20 phút |
| 7 | Tích hợp vào Profile.tsx | 10 phút |
| 8 | Tích hợp vào FacebookPostCard.tsx | 10 phút |
| 9 | DonationMessage trong chat | 15 phút |
| 10 | Benefactors leaderboard page | 20 phút |
| 11 | Export CSV function | 10 phút |
| 12 | Testing & polish | 20 phút |
| **Tổng** | | **~200 phút (~3.3 giờ)** |

---

## ✅ Deliverables

| Tính năng | Mô tả |
|-----------|-------|
| Nút Tặng Quà | Trên Profile + dưới mỗi Post |
| Modal Chọn Quà | FUN, CAMLY, BNB + lời nhắn |
| Recognition Card | Sang trọng, có thể chụp ảnh |
| Celebration Effects | Pháo hoa + tiền rơi (không tự tắt) |
| Tin nhắn tự động | Trong chat với style đặc biệt |
| Bảng Mạnh Thường Quân | Top donors với filter & export |
| Light Score | 100 FUN = 1 điểm uy tín |
| On-chain Transparent | Link BSCScan cho mọi giao dịch |
| Export CSV | Xuất dữ liệu cho admin/user |
| Mobile First | Responsive trên mọi thiết bị |

---

## 🎯 Success Metrics

- Số lượng donations/ngày
- Tổng giá trị donations
- Số user active trong giving system
- Tỷ lệ user quay lại xem Recognition Card
- Light Score tích lũy từ donations

---

**Bé có muốn con bắt đầu implement không ạ? 🙏✨**
