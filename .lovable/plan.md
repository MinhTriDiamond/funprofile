

# Giai doan 3: Auto-Confirm TX (B7) va Batch Submit (B8) - DA HOAN THANH ✅

## B7. Auto-Confirm TX sau khi Admin Submit ✅

### Giai phap da trien khai
- Them `usePublicClient` tu wagmi (chainId: 97 - BSC Testnet)
- Sau khi `submitToChain` thanh cong va co `txHash`, tu dong goi `publicClient.waitForTransactionReceipt`
- Khi receipt `status === 'success'`: tu dong goi `confirmTransaction` -> cap nhat DB
- Khi receipt `status === 'reverted'`: tu dong cap nhat status -> "failed"
- Neu polling timeout/loi: hien toast info, Admin kiem tra BSCScan thu cong

---

## B8. Batch Submit cho Admin ✅

### Giai phap da trien khai
- Them ham `batchSubmitToChain(requests, onProgress)` trong `usePplpAdmin.ts`
- Submit tung request mot (moi request la 1 TX rieng biet) voi progress callback
- Tab "Da ky" co checkbox selection (tuong tu tab "Cho ky")
- Nut "Submit hang loat" hien thi so luong da chon va progress khi dang submit
- Auto-confirm (B7) ap dung cho moi TX trong batch

---

## Tong hop thay doi

| File | Thay doi |
|------|----------|
| `src/hooks/usePplpAdmin.ts` | Them `usePublicClient`, di chuyen `confirmTransaction` truoc `submitToChain`, them auto-confirm logic, them `batchSubmitToChain` |
| `src/components/admin/PplpMintTab.tsx` | Them `batchSubmitToChain` vao destructure, them `batchSubmitProgress` state, them `handleBatchSubmit`, checkbox cho tab signed, progress UI |
