

## Khẩn cấp: Fix Edge Function `sso-web3-auth` đang crash

### Nguyên nhân
Edge function `sso-web3-auth` **không thể khởi động** vì lỗi import:
```
Uncaught SyntaxError: The requested module 'npm:ethers@6/utils' does not provide an export named 'verifyMessage'
```

Điều này có nghĩa **toàn bộ wallet login bị hỏng** — không chỉ riêng tài khoản "Minh Trí Test 3".

### Thông tin tài khoản
- **User ID**: `729fa032-e573-4be9-b32b-c6132c1c4784`
- **Email**: `leminhtri.camlycoin@gmail.com` (signup bằng Email OTP, không phải wallet-first)
- **Wallet**: `0x0ce974850fd60515b4739ad76cadf9e764f3a4e0` (linked vào `external_wallet_address` + `wallet_address`)
- **login_wallet_address**: NULL — chưa được set
- Tài khoản này hoàn toàn bình thường, lỗi nằm ở function.

### Fix

**File: `supabase/functions/sso-web3-auth/index.ts`** — Line 2

Thay:
```typescript
import { verifyMessage as ethersVerifyMessage } from "npm:ethers@6/utils";
```
Bằng:
```typescript
import { ethers } from "npm:ethers@6";
const ethersVerifyMessage = ethers.verifyMessage;
```

Chỉ cần sửa 1 dòng import này là function sẽ hoạt động lại.

