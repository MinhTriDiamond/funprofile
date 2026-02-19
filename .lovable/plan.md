

## Chuyển FUN Money sang Contract mới

### Dia chi moi
`0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6`

### Tong quan

Thay the dia chi contract cu `0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2` bang dia chi moi trong **8 file**. Tat ca logic, ABI, EIP-712 domain, chain ID (97 - BSC Testnet) giu nguyen, chi doi dia chi.

### Danh sach file can sua

| # | File | Vi tri thay doi |
|---|------|-----------------|
| 1 | `src/config/pplp.ts` | `FUN_MONEY_CONTRACT.address` + `EIP712_DOMAIN.verifyingContract` (tu dong theo) |
| 2 | `src/lib/tokens.ts` | Token FUN `address` |
| 3 | `src/hooks/useTokenBalances.ts` | `TOKEN_ADDRESSES.FUN` |
| 4 | `src/components/donations/TokenSelector.tsx` | FUN token `address` |
| 5 | `supabase/functions/_shared/pplp-eip712.ts` | `CONTRACT_ADDRESS` |
| 6 | `supabase/functions/pplp-mint-fun/index.ts` | `FUN_MONEY_CONTRACT` |
| 7 | `supabase/functions/admin-batch-mint-requests/index.ts` | `FUN_MONEY_CONTRACT` |
| 8 | `supabase/functions/detect-incoming-transfers/index.ts` | `FUN_TOKEN_ADDRESS` |

### Chi tiet ky thuat

Moi file chi can thay **1 dong**: doi dia chi cu thanh `0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6`.

- **Frontend (4 file)**: Cap nhat dia chi de doc so du, hien thi token, va tuong tac contract (activate, claim, lockWithPPLP) dung contract moi.
- **Edge Functions (3 file + 1 shared)**: Cap nhat de mint requests, batch signing, va EIP-712 domain tro dung contract moi.
- **EIP-712 Domain**: `verifyingContract` trong `src/config/pplp.ts` tu dong cap nhat vi no tham chieu `FUN_MONEY_CONTRACT.address`. Trong `_shared/pplp-eip712.ts` can doi truc tiep.

### Khong thay doi

- ABI (`FUN_MONEY_ABI`, `LOCK_WITH_PPLP_ABI`) - giu nguyen vi contract moi co cung interface
- Chain ID (97 - BSC Testnet) - giu nguyen
- EIP-712 types (`PureLoveProof`) - giu nguyen
- Logic mint, activate, claim - giu nguyen
- Attester addresses - giu nguyen

