
## Sắp xếp lại Tab FUN Money — Gọn, Khoa Học, Không Trùng Lặp

### Vấn đề hiện tại

Tab `/wallet/fun_money` đang render 3 component xếp chồng lên nhau với nội dung chồng chéo:

| Component | Nội dung | Vấn đề |
|---|---|---|
| `LightScoreDashboard` | Light Score + **FUN Balance Card** + **Claim All** + Recent Actions | Quá dài, 3 card trong 1 |
| `FunBalanceCard` | Locked / Activated / Total FUN on-chain | **Trùng** chủ đề FUN với card trên |
| `ClaimRewardsCard` | Danh sách pending actions + **Claim** | **Trùng** nút Claim với card ở trên |

Ngoài ra, `usePendingActions` được gọi 2 lần (trong `LightScoreDashboard` và `ClaimRewardsCard`), gây 2 API call thừa.

---

### Luồng logic đúng (LOCKED → ACTIVATED → FLOWING)

```text
[1] Light Score        — Tôi đang ở tier nào? Điểm của tôi?
[2] FUN Pending        — Tôi có bao nhiêu FUN chờ được mint?
[3] FUN On-chain       — FUN đã mint: Locked / Activated / Rút về ví
[4] Lịch sử Actions   — Hoạt động gần đây (compact)
```

---

### Giải pháp — Tái cấu trúc `LightScoreDashboard`

Tách `LightScoreDashboard` thành 3 section rõ ràng **trong cùng một component** (để tái dùng data), bỏ bớt nội dung trùng lặp:

**Section 1 — Light Score Card** (giữ nguyên, compact hơn)
- Điểm tổng, tier badge, thanh progress lên tier tiếp theo
- 5 Pillars dạng mini-bar (giữ)

**Section 2 — FUN Pending Actions** (gộp từ `ClaimRewardsCard`, bỏ card riêng)
- Số lượng FUN đang chờ + daily cap progress
- Danh sách grouped actions (collapsible)
- Một nút "Mint [X] FUN" duy nhất

**Section 3 — FUN On-chain Balance** (giữ từ `FunBalanceCard`, compact hơn)
- Locked / Activated / Total dạng 3 ô nhỏ
- Nút Activate và Claim to on-chain wallet
- Badge contract address

**Bỏ hẳn:**
- Card "FUN Money Balance" trong `LightScoreDashboard` (đã gộp vào Section 2)
- Card "Recent Actions" (gộp vào Section 2 dưới dạng collapse)
- Component `ClaimRewardsCard` trong `FunMoneyTab` (không cần nữa)

---

### Thay đổi kỹ thuật

**File 1: `src/components/wallet/LightScoreDashboard.tsx`**
- Refactor thành 3 card rõ ràng theo thứ tự logic
- Nhận thêm props: `walletAddress`, `onActivate`, `onClaim` để Section 3 xử lý on-chain balance
- Chỉ dùng 1 lần `usePendingActions` + 1 lần `useLightScore` (không duplicate)

**File 2: `src/components/wallet/tabs/FunMoneyTab.tsx`**
- Bỏ `<ClaimRewardsCard>` (đã gộp vào dashboard)
- Truyền thêm props `walletAddress`, `onActivate`, `onClaim` vào `<LightScoreDashboard>`
- Bỏ `<FunBalanceCard>` riêng (đã gộp vào Section 3 của dashboard)

**File 3: `src/components/wallet/FunBalanceCard.tsx`**
- Giữ nguyên file (vẫn dùng ở chỗ khác nếu có), nhưng không render trong tab này nữa

**File 4: `src/components/wallet/ClaimRewardsCard.tsx`**
- Giữ nguyên file (không xóa để an toàn), nhưng không render trong tab này nữa

---

### Kết quả sau khi xong

```text
Tab FUN Money
├── [Card 1] 🌟 Light Score
│   ├── Điểm + Tier Badge
│   ├── Progress bar → Tier tiếp theo
│   └── 5 Pillars mini
│
├── [Card 2] ⚡ Pending FUN Money
│   ├── X FUN đang chờ mint | Daily X/Y FUN
│   ├── Danh sách actions (grouped, collapsible)
│   └── [Nút] Mint X FUN
│
└── [Card 3] 💰 Số dư On-chain
    ├── Locked | Activated | Total
    ├── Progress bar activated
    ├── [Nút] Activate | Claim to Wallet
    └── Contract badge
```

3 card, mỗi card một chức năng, không trùng lặp, theo đúng vòng đời FUN Money.
