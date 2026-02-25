

# Cap nhat cach tinh tien trong trang ca nhan va vi

## Van de hien tai
Hien tai co 2 cach tinh khac nhau:
- **Bang Danh Du (Honor Board)**: Tinh dung: `Co the rut = Tong thu - Da rut` (tat ca thoi gian)
- **Vi (Wallet/ClaimRewardsSection)**: Tinh sai theo y nguoi dung: `Co the rut = Thuong hom nay - Da rut hom nay` (chi tinh trong ngay)

## Cach tinh moi (thong nhat)
- **Tong thu**: Tat ca so tien thuong tu truoc den nay (bao gom PPLP rewards)
- **Da rut**: Tong so tien da rut tu truoc den nay (tu bang reward_claims)
- **Co the rut**: Tong thu - Da rut

## Thay doi

### 1. `src/components/wallet/WalletCenterContainer.tsx` (dong 269)
Thay doi cong thuc tinh `claimableReward`:

**Truoc:**
```typescript
setClaimableReward(Math.max(0, todayReward - todayCl));
```

**Sau:**
```typescript
setClaimableReward(Math.max(0, totalReward - claimed));
```

### 2. `src/hooks/useRewardCalculation.ts` (dong 100)
Cap nhat cong thuc tinh `claimableAmount`:

**Truoc:**
```typescript
const claimableAmount = Math.max(0, todayReward);
```

**Sau:**
```typescript
const claimableAmount = Math.max(0, totalReward - claimedAmount);
```

## Ket qua
- Trang ca nhan (Honor Board): Giu nguyen (da dung)
- Vi (Wallet): `Co the rut` = Tong thu - Da rut (thay vi chi tinh hom nay)
- Hook `useRewardCalculation`: Thong nhat cong thuc voi Honor Board
