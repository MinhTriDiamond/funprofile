
# Kế Hoạch Kích Hoạt Reward Claims và Tạo Giao Diện Claim CAMLY

## Tổng Quan

Tạo hệ thống claim CAMLY token hoàn chỉnh, cho phép người dùng nhận phần thưởng từ Treasury Wallet vào ví cá nhân (MetaMask hoặc F.U. Custodial Wallet).

## Thông Tin Hiện Có

### Cấu Trúc Database
- **reward_claims**: Lưu trữ lịch sử claim (user_id, amount, wallet_address)
- **profiles**: Có trường `reward_status` ('pending', 'approved', 'on_hold', 'rejected')
- **transactions**: Lưu giao dịch blockchain

### Reward System
- RPC function `get_user_rewards_v2` đã tính toán totalReward và todayReward
- Hook `useRewardCalculation` đã fetch claimableAmount = totalReward - claimedAmount
- Minimum claim: 1,000,000 CAMLY (theo memory)

### Blockchain Config
- **CAMLY Contract**: `0x0910320181889feFDE0BB1Ca63962b0A8882e413` (3 decimals)
- **Network**: BNB Smart Chain (chainId: 56)
- **Secrets đã có**: `TREASURY_WALLET_ADDRESS`, `TREASURY_PRIVATE_KEY`

### UI Hiện Tại
- WalletCenterContainer.tsx đã có UI hiển thị claimable amount
- Nút "Claim to Wallet" hiện toast "Tính năng đang phát triển"

## Kiến Trúc Giải Pháp

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         CLAIM REWARD FLOW                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   [Frontend]                    [Edge Function]        [Blockchain]  │
│                                                                      │
│   1. User clicks              2. Validate               4. Transfer  │
│      "Claim to Wallet"  ──→     - Auth                     CAMLY     │
│                                 - Amount                     │       │
│   5. Update UI      ←────────  - Wallet address             ↓       │
│      + Confetti                                                      │
│                               3. Sign + Send TX    ──→  Treasury →   │
│                                  with viem               User Wallet │
│                                                                      │
│   6. Record in                                                       │
│      reward_claims table                                             │
│      + transactions table                                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Chi Tiết Triển Khai

### Phần 1: Edge Function `claim-reward`

**File**: `supabase/functions/claim-reward/index.ts`

**Chức năng**:
1. Xác thực người dùng qua JWT
2. Kiểm tra reward_status phải là 'approved'
3. Tính toán claimable amount từ get_user_rewards_v2
4. Validate minimum amount (1,000,000 CAMLY)
5. Kiểm tra wallet address hợp lệ
6. Ký và gửi transaction CAMLY từ Treasury Wallet
7. Lưu vào reward_claims và transactions table
8. Trả về tx_hash và thông tin giao dịch

**Logic chính**:
```text
Input: { wallet_address, amount }

1. Verify JWT → get user_id
2. Check profiles.reward_status = 'approved'
3. Calculate claimable = get_user_rewards_v2.total_reward - SUM(reward_claims.amount)
4. Validate: amount <= claimable && amount >= 1,000,000
5. Create viem wallet client with TREASURY_PRIVATE_KEY
6. Send ERC20 transfer: CAMLY_CONTRACT.transfer(wallet_address, amount * 10^3)
7. Wait for transaction receipt
8. INSERT into reward_claims + transactions
9. Return { success: true, tx_hash, amount }
```

### Phần 2: Cập Nhật supabase/config.toml

Thêm cấu hình cho edge function mới:
```toml
[functions.claim-reward]
verify_jwt = false
```

### Phần 3: Component ClaimRewardDialog

**File**: `src/components/wallet/ClaimRewardDialog.tsx`

**UI Elements**:
- Dialog modal với header "Claim CAMLY Rewards"
- Hiển thị số dư claimable
- Input amount với nút "Max"
- Dropdown chọn ví đích (MetaMask hoặc F.U. Wallet)
- Hiển thị estimated gas fee
- Nút "Claim" với loading state
- Success state với confetti animation
- Link đến BSCScan sau khi thành công

### Phần 4: Hook useClaimReward

**File**: `src/hooks/useClaimReward.ts`

**Functions**:
- `claimReward(amount, walletAddress)`: Gọi edge function
- `isLoading`, `error`, `txHash` states
- Auto-invalidate reward-stats cache sau khi claim thành công

### Phần 5: Cập Nhật WalletCenterContainer

**Thay đổi**:
- Import và sử dụng ClaimRewardDialog
- Thay toast bằng mở dialog khi click "Claim to Wallet"
- Thêm confetti animation khi claim thành công
- Refresh token balances và transactions sau khi claim

## Validation Rules

| Rule | Value | Error Message |
|------|-------|---------------|
| Minimum claim | 1,000,000 CAMLY | "Số tiền tối thiểu là 1,000,000 CAMLY" |
| Reward status | Must be 'approved' | "Phần thưởng chưa được Admin duyệt" |
| Wallet address | Valid BSC address | "Địa chỉ ví không hợp lệ" |
| Sufficient balance | amount <= claimable | "Số tiền vượt quá số dư khả dụng" |
| Treasury balance | Sufficient CAMLY | "Treasury không đủ token, vui lòng liên hệ Admin" |

## Bảo Mật

1. **JWT Verification**: Tất cả request phải có auth token
2. **Rate Limiting**: Tối đa 1 claim/phút/user
3. **Wallet Validation**: Kiểm tra checksum address
4. **Amount Validation**: Server-side validation, không tin client
5. **Audit Logging**: Ghi log mọi claim vào audit_logs

## Files Cần Tạo/Sửa

| File | Action | Mô tả |
|------|--------|-------|
| `supabase/functions/claim-reward/index.ts` | CREATE | Edge function xử lý claim |
| `supabase/config.toml` | UPDATE | Thêm config cho claim-reward |
| `src/components/wallet/ClaimRewardDialog.tsx` | CREATE | Dialog UI cho claim |
| `src/hooks/useClaimReward.ts` | CREATE | Hook quản lý claim logic |
| `src/components/wallet/WalletCenterContainer.tsx` | UPDATE | Tích hợp ClaimRewardDialog |

## User Flow Hoàn Chỉnh

1. User vào trang `/wallet`
2. Thấy "Claimable: X CAMLY" với nút "Claim to Wallet"
3. Nếu reward_status != 'approved': Hiển thị trạng thái và disable nút
4. Nếu reward_status == 'approved':
   - Click "Claim to Wallet" → Mở ClaimRewardDialog
   - Nhập số lượng hoặc click "Max"
   - Chọn ví đích (MetaMask/F.U. Wallet)
   - Click "Claim" → Loading state
   - Thành công → Confetti + Success message + Link BSCScan
   - Tự động refresh balances và claimable amount
5. Giao dịch xuất hiện trong "Recent Activity"

## Timeline Ước Tính

1. Edge Function claim-reward: Core blockchain logic
2. ClaimRewardDialog: UI component với animations
3. useClaimReward hook: State management
4. Tích hợp vào WalletCenterContainer: Final integration
5. Test end-to-end: Verify trên BSC

