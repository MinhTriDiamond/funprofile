
# Kế Hoạch Xoá F.U. Wallet (Custodial)

## Mục Tiêu

Xoá bỏ card **F.U. Wallet (Custodial)** khỏi trang `/wallet`, chỉ giữ lại phần **External Wallet**.

## Layout Mới

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                           My Wallet                                       │
│                        BNB Smart Chain                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                     External Wallet (Full Width)                          │
│                MetaMask / Bitget / Trust / FUN Wallet                     │
├──────────────────────────────────────────────────────────────────────────┤
│  0xABC1...DEF4        [Copy] [Connect]                                   │
│                                                                          │
│  Total: $XXX.XX                                                          │
│                                                                          │
│  ┌──────┐ ┌───────┐ ┌──────┐ ┌─────┐                                    │
│  │ Send │ │Receive│ │ Swap │ │ Buy │                                    │
│  └──────┘ └───────┘ └──────┘ └─────┘                                    │
│                                                                          │
│  ── Tokens ──────────────────                                            │
│  BNB    $XXX.XX    0.XXX                                                 │
│  USDT   $XXX.XX    XXX                                                   │
│  CAMLY  $XXX.XX    XXX                                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Chi Tiết Thay Đổi

### File: `src/components/wallet/WalletCenterContainer.tsx`

| Thay đổi | Chi tiết |
|----------|----------|
| Xoá Custodial WalletCard | Xoá block lines 505-520 (F.U. Wallet card) |
| Đổi grid layout | Từ `grid-cols-1 lg:grid-cols-2` thành single column |
| Xoá custodial states | Xoá `copiedCustodial`, `isCreatingWallet`, `walletCreationError` |
| Xoá custodial hooks | Xoá `custodialTokens`, `custodialTotalValue`, `refetchCustodial` |
| Xoá custodial functions | Xoá `createCustodialWallet`, `copyCustodialAddress` |
| Xoá auto-create logic | Xoá useEffect auto-create custodial wallet |
| Cập nhật Claim Dialog | Chỉ dùng external wallet |
| Cập nhật Receive Dialog | Chỉ dùng external wallet |

### Các phần cần xoá/sửa:

1. **States cần xoá:**
   - `copiedCustodial`
   - `isCreatingWallet`
   - `walletCreationError`
   - `showReceiveFor`

2. **Hooks cần xoá:**
   - `useTokenBalances` cho custodial address

3. **Functions cần xoá:**
   - `createCustodialWallet`
   - `copyCustodialAddress`

4. **useEffects cần xoá:**
   - Auto-create custodial wallet effect

5. **UI cần xoá:**
   - F.U. Wallet card (lines 505-520)

6. **UI cần sửa:**
   - Grid layout: full width thay vì 2 cột
   - ClaimRewardDialog: bỏ option custodial wallet
   - ReceiveTab: không cần chọn loại ví

## Code Changes

### Trước (2 cột):
```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* F.U. Wallet */}
  <WalletCard walletType="custodial" ... />
  
  {/* External Wallet */}
  <WalletCard walletType="external" ... />
</div>
```

### Sau (1 cột full width):
```typescript
<div className="w-full">
  {/* External Wallet Only */}
  <WalletCard walletType="external" ... />
</div>
```

## Files Cần Sửa

| File | Action |
|------|--------|
| `src/components/wallet/WalletCenterContainer.tsx` | UPDATE - Xoá custodial, đổi layout |
| `src/components/wallet/ClaimRewardDialog.tsx` | UPDATE - Xoá option custodial |

## Tóm Tắt

1. **Xoá F.U. Wallet card** khỏi giao diện
2. **Chuyển layout về single column** cho External Wallet
3. **Dọn dẹp code** không sử dụng (custodial states, hooks, functions)
4. **Cập nhật Claim Dialog** chỉ sử dụng external wallet
