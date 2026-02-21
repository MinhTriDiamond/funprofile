

## Fix: Lọc chỉ hiển thị sign-request thực sự trong AttesterSigningPanel

### Nguyên nhân

Các mint-request cũ (trước khi có multisig) vẫn có `status = 'signed'` nhưng `multisig_completed_groups = '{}'` (rỗng) và `multisig_signatures = '{}'`. Query hiện tại chỉ lọc theo status mà không kiểm tra xem request đó có thực sự đi qua quy trình multisig hay không.

### Giải pháp

**File:** `src/hooks/useAttesterSigning.ts`

Thay doi duy nhat: them filter vao Supabase query de loai bo cac request co `multisig_completed_groups` rong:

```typescript
.in('status', ['signing', 'signed'])
.not('multisig_completed_groups', 'eq', '{}')  // Chi lay request da co it nhat 1 chu ky multisig
```

Dieu nay dam bao chi nhung sign-request da duoc admin khoi tao (co it nhat 1 chu ky trong multisig_completed_groups) moi hien thi trong AttesterSigningPanel.

### Ket qua

- Request cu (pre-multisig) voi `multisig_completed_groups = '{}'`: **an**
- Sign-request do admin tao (co 1+ chu ky): **hien thi**
- Mint-request chua duoc admin tao sign-request: **an**

