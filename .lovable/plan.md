
# Kiểm tra & Sửa hệ thống Mint FUN theo mô hình Epoch

## Kết quả kiểm tra

### Đã đúng (Backend)

| Quy tắc | File | Status |
|---------|------|--------|
| Pool = 5M FUN | `pplp-epoch-snapshot` dòng 12 | OK |
| FUN = Pool x (LS / Total LS) | `pplp-epoch-snapshot` dòng 144 | OK |
| Anti-whale 3% (150K) | `pplp-epoch-snapshot` dòng 158 | OK |
| LS >= 10 | `pplp-epoch-snapshot` dòng 129 | OK |
| PPLP approved | `pplp-epoch-snapshot` dòng 76 | OK |
| Không fraud (is_banned) | `pplp-epoch-snapshot` dòng 99-126 | OK |
| mint_amount = 0 (epoch model) | `pplp-evaluate` dòng 331 | OK |
| Epoch allocation hook | `useEpochAllocation.ts` | OK |
| ClaimRewardsCard UI | `ClaimRewardsCard.tsx` | OK |
| Admin Snapshot UI | `PplpMintTab.tsx` dòng 77-137 | OK |

### Lỗi nghiêm trọng (Frontend)

**`ClaimRewardsCard` (Epoch-based) tồn tại nhưng KHÔNG được sử dụng trong app.**

Hiện tại `FunMoneyTab` chỉ render:
1. `AttesterSigningPanel` (OK)
2. `FunMoneyGuide` (OK)
3. `LightScoreDashboard` — dùng `usePendingActions` cũ, nơi `mint_amount = 0` do epoch model

Kết quả: Card "FUN Money Chờ Mint" luôn hiển thị **0 FUN**, nút Mint không bao giờ hoạt động vì `totalAmount` luôn = 0.

## Giải pháp

### File: `src/components/wallet/tabs/FunMoneyTab.tsx`

Thêm `ClaimRewardsCard` vào giữa `FunMoneyGuide` và `LightScoreDashboard`:

```text
AttesterSigningPanel (nếu là GOV attester)
    |
FunMoneyGuide
    |
ClaimRewardsCard  <-- THÊM MỚI (Epoch-based claiming)
    |
LightScoreDashboard (Light Score + On-chain balance)
```

- Import `ClaimRewardsCard` từ `@/components/wallet/ClaimRewardsCard`
- Truyền prop `onClaimSuccess` từ FunMoneyTab props
- Card này hiển thị: Light Score tích lũy tháng hiện tại, Epoch allocation, nút Claim

### File: `src/components/wallet/LightScoreDashboard.tsx`

Xóa hoặc ẩn Card 2 ("FUN Money Chờ Mint") vì nó dùng `usePendingActions` cũ (luôn = 0 trong epoch model). Giữ lại:
- Card 1: Light Score (5 Pillars)
- Card 3: FUN On-chain Balance

Loại bỏ import và sử dụng `usePendingActions`, `useMintHistory` vì không còn cần thiết trong LightScoreDashboard.

### Tác động

- User sẽ thấy **Light Score tích lũy trong tháng** và **FUN allocation từ epoch trước** (nếu có)
- Nút "Claim" hoạt động đúng qua `useEpochAllocation` -> `pplp-mint-fun`
- Không còn hiển thị "0 FUN chờ mint" gây nhầm lẫn
