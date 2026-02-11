

# Bo Sung Dia Chi Attester Moi

## Thay doi

Chuyen `ATTESTER_ADDRESS` tu mot dia chi duy nhat thanh mot mang (array) cac dia chi duoc uy quyen, va cap nhat logic kiem tra trong `PplpMintTab.tsx`.

### 1. Cap nhat `src/config/pplp.ts`
- Doi `ATTESTER_ADDRESS` thanh `ATTESTER_ADDRESSES` (mang)
- Giu `ATTESTER_ADDRESS` cu lam alias cho tuong thich nguoc
- Them dia chi moi `0xD41Cc6beCB196FaCa3CDebDa2f6Fb42A12EdC389`

### 2. Cap nhat `src/components/admin/PplpMintTab.tsx`
- Thay doi logic `isAttesterWallet` tu so sanh 1 dia chi thanh kiem tra trong mang
- Cap nhat thong bao loi de khong con hien thi 1 dia chi cu dinh

### 3. Cap nhat `src/hooks/usePplpAdmin.ts`  
- Cap nhat toast message neu co tham chieu den Attester address

## Chi tiet ky thuat

```text
// Truoc:
export const ATTESTER_ADDRESS = '0xe32d...' as const;

// Sau:
export const ATTESTER_ADDRESSES: readonly string[] = [
  '0xe32d50a0badE4cbD5B0d6120d3A5FD07f63694f1',
  '0xD41Cc6beCB196FaCa3CDebDa2f6Fb42A12EdC389',
];
export const ATTESTER_ADDRESS = ATTESTER_ADDRESSES[0]; // backward compat

// Helper
export const isAttesterAddress = (addr: string) =>
  ATTESTER_ADDRESSES.some(a => a.toLowerCase() === addr.toLowerCase());
```

Logic kiem tra trong PplpMintTab se doi tu:
```text
address?.toLowerCase() === ATTESTER_ADDRESS.toLowerCase()
```
thanh:
```text
isAttesterAddress(address ?? '')
```

## Luu y quan trong
Dia chi moi **phai duoc dang ky tren Smart Contract** boi Guardian/Owner thong qua ham `govRegisterAttester` (hoac tuong duong). Neu chua dang ky on-chain, vi se duoc nhan dien tren giao dien nhung giao dich ky se bi tu choi boi contract.

