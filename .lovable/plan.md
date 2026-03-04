
# Bỏ yêu cầu min-send trên Testnet

## Thay đổi

### File: `src/components/donations/UnifiedGiftSendDialog.tsx` (dòng 169-174)

Sửa logic `minSendCheck` để skip validation khi `selectedChainId === 97` (Testnet):

```typescript
const minSendCheck = parsedAmountNum > 0
  ? (selectedChainId === BSC_TESTNET
      ? { valid: true }
      : validateMinSendValue(parsedAmountNum, selectedTokenPrice))
  : { valid: false } as { valid: boolean; message?: string };
```

### File: `src/hooks/useDonation.ts` (dòng 72-77)

Thêm param `chainId` vào `DonationParams` check: nếu `chainId === 97` thì skip `validateMinSendValue`. Tuy nhiên `useDonation` đã có `chainId` từ `useAccount()` — chỉ cần wrap điều kiện:

```typescript
if (chainId !== 97) {
  const minCheck = validateMinSendValue(amount, priceUSD);
  if (!minCheck.valid) { ... }
}
```

Tổng cộng sửa 2 file, không thay đổi UI layout.
