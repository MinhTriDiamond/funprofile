

# Giai doan 3: Auto-Confirm TX (B7) va Batch Submit (B8)

## B7. Auto-Confirm TX sau khi Admin Submit

### Van de hien tai
Sau khi Admin submit transaction on-chain, trang thai trong database van la "submitted". Admin phai thu cong xac nhan. Hook `useWaitForTransactionReceipt` da ton tai nhung KHONG duoc ket noi voi logic cap nhat database.

### Giai phap
Them logic polling tu dong trong `usePplpAdmin.ts`:
- Sau khi `submitToChain` thanh cong va co `txHash`, tu dong goi `waitForTransactionReceipt` tu viem
- Khi receipt co (`isSuccess`), tu dong cap nhat database: status -> "confirmed", cap nhat `light_actions` -> "minted"
- Hien thi toast thong bao thanh cong

### File can sua: `src/hooks/usePplpAdmin.ts`

1. Them `usePublicClient` tu wagmi de goi `waitForTransactionReceipt`
2. Sua `submitToChain`: sau khi co txHash, bat dau polling receipt
3. Khi receipt confirmed -> tu dong goi `confirmTransaction` va refresh danh sach

```typescript
// Trong submitToChain, sau khi co txHash:
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
if (receipt.status === 'success') {
  await confirmTransaction({ ...request, tx_hash: txHash });
}
```

---

## B8. Batch Submit cho Admin

### Van de hien tai
Nut "Submit tat ca" trong tab "Da ky" (line 409-417) ton tai nhung KHONG CO onClick handler. Admin phai submit tung request mot.

### Giai phap

**File 1: `src/hooks/usePplpAdmin.ts`**
- Them ham `batchSubmitToChain(requests: MintRequest[])` 
- Submit tung request mot (vi moi request la 1 TX rieng biet)
- Tra ve so luong thanh cong

**File 2: `src/components/admin/PplpMintTab.tsx`**
- Them `handleBatchSubmit` goi `batchSubmitToChain`
- Ket noi voi nut "Submit tat ca" hien co (line 409-417)
- Them checkbox selection cho tab "signed" (tuong tu tab "pending_sig")
- Hien thi progress khi dang batch submit

---

## Tong hop thay doi

| File | Thay doi |
|------|----------|
| `src/hooks/usePplpAdmin.ts` | Them auto-confirm bang `waitForTransactionReceipt`, them `batchSubmitToChain` |
| `src/components/admin/PplpMintTab.tsx` | Ket noi batch submit button, them checkbox cho tab signed, hien thi progress |
| `.lovable/plan.md` | Cap nhat trang thai B7, B8 thanh "hoan thanh" |

