
# Kế Hoạch Sửa PPLP Minting - Khớp Với Smart Contract v1.2.1

## Vấn Đề Đã Xác Định

Transaction revert vì:
1. EIP-712 signature struct không khớp với contract `PPLP_TYPEHASH`
2. Contract call parameters sai type và thứ tự

## Thay Đổi Cần Thực Hiện

### 1. Cập nhật `src/config/pplp.ts`

#### A. Sửa EIP-712 Types

```typescript
// TRƯỚC (SAI)
export const EIP712_LOCK_TYPES = {
  Lock: [
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'evidenceHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },  // <- Contract không có!
  ],
} as const;

// SAU (ĐÚNG - khớp contract PPLP_TYPEHASH)
export const EIP712_PPLP_TYPES = {
  PureLoveProof: [
    { name: 'user', type: 'address' },
    { name: 'actionHash', type: 'bytes32' },
    { name: 'amount', type: 'uint256' },
    { name: 'evidenceHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;
```

#### B. Sửa Contract ABI

```typescript
// TRƯỚC (SAI - dựa trên tham số sai)
{
  name: 'lockWithPPLP',
  inputs: [
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'actionHash', type: 'bytes32' },  // <- Contract nhận STRING!
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },    // <- Contract không có!
    { name: 'signatures', type: 'bytes[]' },
  ],
}

// SAU (ĐÚNG - khớp contract function)
{
  name: 'lockWithPPLP',
  inputs: [
    { name: 'user', type: 'address' },
    { name: 'action', type: 'string' },       // STRING action name!
    { name: 'amount', type: 'uint256' },
    { name: 'evidenceHash', type: 'bytes32' },
    { name: 'sigs', type: 'bytes[]' },
  ],
}
```

#### C. Sửa BSCScan URL

```typescript
// TRƯỚC (SAI - Mainnet)
export const BSCSCAN_URL = 'https://bscscan.com';

// SAU (ĐÚNG - Testnet)
export const BSCSCAN_URL = 'https://testnet.bscscan.com';
```

### 2. Cập nhật `src/hooks/usePplpAdmin.ts`

#### A. Import mới

```typescript
import {
  EIP712_DOMAIN,
  EIP712_PPLP_TYPES,  // Thay đổi từ EIP712_LOCK_TYPES
  FUN_MONEY_CONTRACT,
  FUN_MONEY_ABI,
  MINT_REQUEST_STATUS,
  getTxUrl,
} from '@/config/pplp';
```

#### B. Sửa signMintRequest - EIP-712 message

```typescript
// TRƯỚC (SAI)
const message = {
  recipient: request.recipient_address,
  amount: BigInt(request.amount_wei),
  evidenceHash: request.evidence_hash,
  nonce: BigInt(request.nonce),
  deadline: BigInt(request.deadline),  // <- Không tồn tại trong contract
};

// SAU (ĐÚNG)
const message = {
  user: request.recipient_address as `0x${string}`,
  actionHash: request.action_hash as `0x${string}`,  // Cần thêm field này
  amount: BigInt(request.amount_wei),
  evidenceHash: request.evidence_hash as `0x${string}`,
  nonce: BigInt(request.nonce),
};
```

#### C. Sửa signTypedDataAsync call

```typescript
// TRƯỚC
const signature = await signTypedDataAsync({
  types: EIP712_LOCK_TYPES,
  primaryType: 'Lock',
  message,
  ...
});

// SAU
const signature = await signTypedDataAsync({
  types: EIP712_PPLP_TYPES,
  primaryType: 'PureLoveProof',
  message,
  ...
});
```

#### D. Sửa submitToChain - Contract call

```typescript
// TRƯỚC (SAI)
args: [
  request.recipient_address,
  BigInt(request.amount_wei),
  request.evidence_hash,
  BigInt(request.nonce),
  BigInt(request.deadline),  // <- Contract không có param này!
  [request.signature],
],

// SAU (ĐÚNG)
args: [
  request.recipient_address as `0x${string}`,  // user
  request.action_name,                          // action (STRING!)
  BigInt(request.amount_wei),                   // amount
  request.evidence_hash as `0x${string}`,       // evidenceHash
  [request.signature as `0x${string}`],         // sigs
],
```

### 3. Cập nhật `supabase/functions/pplp-mint-fun/index.ts`

#### A. Thêm tính toán action_hash

Contract tính `actionHash = keccak256(bytes(action))`, nên Edge Function cần:

```typescript
// Thêm logic tính action_hash
const actionName = 'light_action';  // Hoặc derive từ action_types
const actionHash = keccak256(toBytes(actionName));

// Lưu vào mint_request
const { data: mintRequest } = await supabase
  .from('pplp_mint_requests')
  .insert({
    ...existingFields,
    action_name: actionName,      // Thêm mới
    action_hash: actionHash,      // Thêm mới
    // Bỏ deadline vì contract không dùng
  })
```

### 4. Cập nhật Database Schema

Thêm columns mới vào bảng `pplp_mint_requests`:

```sql
ALTER TABLE pplp_mint_requests 
ADD COLUMN IF NOT EXISTS action_name TEXT NOT NULL DEFAULT 'light_action',
ADD COLUMN IF NOT EXISTS action_hash TEXT;

-- Bỏ constraint deadline nếu có
ALTER TABLE pplp_mint_requests 
ALTER COLUMN deadline DROP NOT NULL;
```

## Luồng Hoạt Động Sau Khi Sửa

```text
User Claim → Edge Function tạo request
                ↓
       Tính action_hash = keccak256("light_action")
       Lưu action_name, action_hash vào DB
                ↓
Admin Ký → Frontend tạo EIP-712 message:
       {
         user: wallet_address,
         actionHash: action_hash,      ← Khớp contract
         amount: amount_wei,
         evidenceHash: evidence_hash,
         nonce: contract_nonce,
       }
                ↓
       signTypedDataAsync với primaryType: 'PureLoveProof'
                ↓
Admin Submit → Contract call:
       lockWithPPLP(
         user,
         "light_action",               ← STRING action name
         amount,
         evidenceHash,
         [signature]
       )
                ↓
       Contract verify:
         1. h = keccak256("light_action") → actionHash
         2. Validate action registered & not deprecated
         3. Verify EIP-712 signature với structHash
         4. Mint tokens!
```

## Quan Trọng: Đăng Ký Action Trước

Contract kiểm tra:
```solidity
require(act.allowed && !act.deprecated, "ACTION_INVALID");
```

Nếu chưa đăng ký "light_action", Guardian Gov cần gọi:
```solidity
govRegisterAction("light_action", 1);
```

## Tóm Tắt Files Cần Sửa

| File | Thay Đổi |
|------|----------|
| `src/config/pplp.ts` | EIP-712 types, ABI, BSCScan URL |
| `src/hooks/usePplpAdmin.ts` | Sign message, contract call args |
| `supabase/functions/pplp-mint-fun/index.ts` | Tính action_hash, bỏ deadline |
| Database migration | Thêm action_name, action_hash columns |

## Thời Gian Triển Khai

~30 phút
