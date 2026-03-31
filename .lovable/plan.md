

## Chỉnh PostFooter giống Facebook, giữ nút Tặng quà

### Phân tích

Hiện tại footer có 4 nút nằm ngang đều nhau với icon + text: Thích | Bình luận | Chia sẻ | Tặng quà.

Trong hình Facebook (image 1): chỉ có **3 icon nhỏ gọn** (❤️ 💬 ↗️) nằm bên trái, **reaction summary** (👍❤️) nằm bên phải, không có text label dưới icon.

### Thay đổi

**File `src/components/feed/PostFooter.tsx`** — Đổi layout footer:

1. **Bỏ layout chia đều flex-1** → chuyển sang layout 2 phần:
   - **Trái**: 3-4 icon buttons nhỏ gọn (Thích, Bình luận, Chia sẻ, Tặng quà) — chỉ icon, **không text label**
   - **Phải**: Reaction summary emojis (👍❤️ + số lượng)

2. **ReactionSummary** chuyển từ hiển thị phía trên → hiển thị **cùng hàng bên phải** của icon buttons

3. **Nút Tặng quà** giữ nguyên nhưng chỉ hiện icon (không text), style nhỏ gọn giống các nút khác

**File `src/components/feed/ReactionButton.tsx`** — Bỏ text label:
- Chỉ hiện emoji/icon, không hiện text "Thích" / tên reaction
- Giảm kích thước button cho compact hơn

**File `src/components/feed/ReactionSummary.tsx`** — Đổi layout:
- Bỏ dòng riêng, chuyển thành inline component nằm bên phải hàng buttons
- Chỉ hiện emoji circles + số, comment count + share count xuống dòng hoặc bỏ (vì Facebook hiện riêng)

**File `src/components/donations/DonationButton.tsx`** — Variant `post`:
- Chỉ hiện icon HandCoins, bỏ text "Tặng quà"

### Cụ thể layout mới

```text
┌─────────────────────────────────────────┐
│ [❤️] [💬] [↗️] [🎁]          👍❤️ 12  │
│                              2 bình luận│
└─────────────────────────────────────────┘
```

So với hiện tại:
```text
┌─────────────────────────────────────────┐
│        👍❤️ 12          2 bình luận     │ ← ReactionSummary riêng
├─────────────────────────────────────────┤
│  👍 Thích  | 💬 Bình luận | ↗️ Chia sẻ | 🎁 Tặng quà │
└─────────────────────────────────────────┘
```

### Files thay đổi
- `src/components/feed/PostFooter.tsx` — Layout chính
- `src/components/feed/ReactionButton.tsx` — Bỏ text, compact hơn
- `src/components/feed/ReactionSummary.tsx` — Inline bên phải
- `src/components/donations/DonationButton.tsx` — Icon-only cho variant post

