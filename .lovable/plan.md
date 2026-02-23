
# Hợp Nhất Tính Năng Mint

## Tổng quan

Hiện tại có 2 nơi hiển thị tính năng Mint FUN Money:
1. **`/wallet/fun_money`** -- LightScoreDashboard (đầy đủ: Light Score, Pending Actions, On-chain Balance, Mint History)
2. **`/mint`** -- Trang riêng với MintHeader, MintGuide, MintOnChainPanel, LightActionsList (trùng lặp)

Giải pháp: Khi click nút Mint trên Navbar, navigate thẳng đến `/wallet/fun_money` thay vì `/mint`. Xóa route `/mint` và các component riêng của nó.

## Các thay đổi

### 1. Navbar: Đổi đích navigate từ `/mint` sang `/wallet/fun_money`

**File `src/components/layout/FacebookNavbar.tsx`:**
- Thay `navigate('/mint')` thanh `navigate('/wallet/fun_money')`
- Thay `isActive('/mint')` thanh `isActive('/wallet/fun_money')`
- Giữ nguyên giao diện nút Mint (GIF logo, gold styling)

### 2. Xóa route `/mint` khỏi App.tsx

**File `src/App.tsx`:**
- Xóa import `const Mint = lazy(...)`
- Xóa `<Route path="/mint" ...>`

### 3. Xóa trang và component Mint không còn dùng

Xóa 6 file:
- `src/pages/Mint.tsx`
- `src/components/mint/MintHeader.tsx`
- `src/components/mint/MintGuide.tsx`
- `src/components/mint/MintOnChainPanel.tsx`
- `src/components/mint/LightActionsList.tsx`
- `src/components/mint/LightActionCard.tsx`

### 4. Cập nhật guest allowed paths

**File `src/components/auth/LawOfLightGuard.tsx`:**
- Xóa `'/mint'` khỏi danh sach `guestAllowedPaths` (vi trang wallet yeu cau dang nhap)

## Tính năng giữ lại

Toàn bộ tính năng ở `/wallet/fun_money` được giữ nguyên 100%:
- Light Score and Tier Status
- Pending FUN Money (claim actions)
- On-chain Balance (Locked/Activated)
- Activate and Claim dialogs
- Attester Signing Panel (cho GOV)
- Mint History

## Lý do không cần giữ lại các component ở `/mint`

| Component `/mint` | Tương đương ở `/wallet/fun_money` |
|---|---|
| MintHeader (tiêu đề + testnet warning) | Không cần -- wallet đã có context rõ ràng |
| MintGuide (4 bước hướng dẫn) | LightScoreDashboard đã có flow tự nhiên |
| MintOnChainPanel (FunBalanceCard) | LightScoreDashboard Section 3: On-chain Balance |
| LightActionsList (actions + claim) | LightScoreDashboard Section 2: Pending FUN Money |

Tất cả đều đã có đầy đủ và chi tiết hơn trong LightScoreDashboard.
