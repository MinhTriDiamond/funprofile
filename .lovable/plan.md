

## Chỉnh footer bài viết giống Facebook (có text label + dàn đều)

Hình user gửi cho thấy footer kiểu Facebook với **2 phần tách biệt**:
1. **Dòng trên**: Reaction summary (emoji + số lượng) bên trái, comment/share count bên phải
2. **Dòng dưới**: 4 nút dàn đều nhau, mỗi nút có **icon + text**: `🥰 Thương thương` | `💬 Bình luận` | `↗️ Chia sẻ` | `🎁 Tặng quà`

Hiện tại code đang là icon-only bên trái + summary bên phải (cùng 1 hàng). Cần đổi lại.

### Thay đổi

**File `src/components/feed/PostFooter.tsx`** — Đổi layout thành 2 dòng:
- **Dòng 1**: `ReactionSummary` (full width, flex justify-between: emoji+count trái, comment/share count phải)
- **Dòng 2**: 4 nút chia đều `flex-1` với icon + text label:
  - ReactionButton (hiện emoji/label của reaction hiện tại, hoặc 👍 Thích)
  - Bình luận (MessageCircle + text)
  - Chia sẻ (Share2 + text)
  - Tặng quà (HandCoins + text) — chỉ hiện khi không phải bài của mình

**File `src/components/feed/ReactionButton.tsx`** — Thêm lại text label:
- Hiển thị text bên cạnh icon (tên reaction hiện tại hoặc "Thích")
- Button style: `flex-1 flex items-center justify-center gap-1.5` thay vì `p-2.5 rounded-full`

**File `src/components/feed/ReactionSummary.tsx`** — Đổi layout dòng trên:
- `flex justify-between w-full`: emoji+count bên trái, comment/share count bên phải

**File `src/components/donations/DonationButton.tsx`** — Thêm variant `footer`:
- Hiện icon + text "Tặng quà", style giống các nút khác (`flex-1 flex items-center justify-center gap-1.5`)

### Layout mục tiêu
```text
┌──────────────────────────────────────────┐
│ 🥰 1                    2 bình luận      │  ← ReactionSummary
├──────────────────────────────────────────┤
│ 🥰 Thương thương | 💬 Bình luận | ↗️ Chia sẻ | 🎁 Tặng quà │
└──────────────────────────────────────────┘
```

### Files thay đổi
- `src/components/feed/PostFooter.tsx`
- `src/components/feed/ReactionButton.tsx`
- `src/components/feed/ReactionSummary.tsx`
- `src/components/donations/DonationButton.tsx`

