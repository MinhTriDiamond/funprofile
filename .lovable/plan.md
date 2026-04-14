

# Đánh giá & Kế hoạch triển khai FUNMoneyMinter-2.sol

## 1. Phân tích hợp đồng mới

**FUNMoneyMinter-2.sol** là thiết kế contract hoàn toàn mới, thay thế mô hình EIP-712/lockWithPPLP hiện tại bằng kiến trúc đơn giản hơn:

| Khía cạnh | Contract hiện tại (v1.2.1) | FUNMoneyMinter-2 |
|---|---|---|
| Cơ chế mint | `lockWithPPLP` + EIP-712 signatures + Multisig 3-of-3 | `mintValidatedAction` — backend gọi trực tiếp |
| Quy trình user | Lock → Activate → Claim (3 bước) | Mint thẳng vào ví (1 bước) hoặc locked grant |
| Split rule | Code ngoài contract (cascade 3 tầng ~97%) | **On-chain immutable**: `USER_BPS=9900` / `PLATFORM_BPS=100` |
| Time-lock | Không có | `mintValidatedActionLocked` + `releaseLockedGrant` |
| Access control | Attester + EIP-712 verify | `authorizedMinters` mapping |
| Dedup | Nonce-based | `processedActionIds` (bytes32) |

### Điểm mạnh

- **99/1 split hardcoded on-chain** — không thể sửa, đúng tinh thần PPLP
- **Đơn giản hóa UX**: User không cần Activate + Claim 2 bước nữa
- **Time-lock native**: `mintValidatedActionLocked` cho phép lock + release tự động theo thời gian
- **actionId dedup on-chain**: Chống double-mint ở tầng smart contract
- **validationDigest**: Ghi hash của validation payload on-chain để audit

### Rủi ro cần lưu ý

- **Quyền `authorizedMinter` rất lớn**: Ai có quyền này có thể mint tùy ý → cần bảo vệ private key cẩn thận
- **Mất multisig 3-of-3**: Không còn kiểm soát cộng đồng qua WILL/WISDOM/LOVE → trade-off giữa UX và decentralization
- **Contract chưa deploy**: Cần owner triển khai contract mới + set authorizedMinter cho backend hot wallet

## 2. Tác động đến hệ thống

### Hệ thống v1 (Epoch mint)
- Vẫn dùng contract v1.2.1 (`lockWithPPLP`) → **không thay đổi**
- `pplp-mint-fun`, `pplp-auto-submit`, multisig flow → giữ nguyên

### Hệ thống v2 (Truth Validation Engine)
- Hiện tại `pplp_v2_mint_records` chỉ ghi off-chain ledger, status `pending`
- FUNMoneyMinter-2 cho phép **on-chain mint trực tiếp** cho v2 actions đã validated

## 3. Kế hoạch triển khai

### Bước 1: Lưu trữ contract ABI & config
- Thêm `FUN_MONEY_MINTER_2` config vào `src/config/pplp.ts` (address placeholder, ABI đầy đủ)
- Giữ nguyên config v1.2.1 hiện tại — chạy song song

### Bước 2: Edge Function `pplp-v2-onchain-mint`
- Nhận `mint_record_id` từ `pplp_v2_mint_records` (status = `pending`)
- Tính `actionId = keccak256(action_id)`, `validationDigest = keccak256(validation JSON)`
- Gọi `mintValidatedAction` hoặc `mintValidatedActionLocked` (nếu release_mode = locked)
- Cập nhật `pplp_v2_mint_records.status` → `minted` + ghi `tx_hash`
- Cập nhật `pplp_v2_balance_ledger` với entry_type `claim`
- **Cần secret**: `MINTER_PRIVATE_KEY` (private key của authorized minter wallet)

### Bước 3: Frontend — Release locked grants
- Hook `useLockedGrants`: đọc `getLockedGrants(user)` từ contract
- UI hiển thị danh sách locked grants + nút "Release" khi `block.timestamp >= releaseAt`
- Gọi `releaseLockedGrant(index)` trực tiếp từ user wallet

### Bước 4: Cập nhật `pplp-v2-validate-action`
- Sau khi ghi `pplp_v2_mint_records`, tự động gọi `pplp-v2-onchain-mint` (hoặc queue cho cron job)
- Thêm logic chọn `release_mode`: instant vs locked (dựa trên light score hoặc trust level)

### Bước 5: Admin UI — Preview split
- Gọi `previewSplit(totalMint)` để hiển thị 99/1 breakdown trước khi mint
- Dashboard theo dõi `processedActionIds` on-chain

## 4. Điều kiện tiên quyết (cần owner thực hiện)

| Việc | Ai làm |
|---|---|
| Deploy FUNMoneyMinter-2.sol lên BSC Testnet | Owner |
| Gọi `setAuthorizedMinter(backendWallet, true)` | Owner |
| Cấp quyền `mint` cho FUNMoneyMinter-2 trên FUN Token contract | Owner |
| Cung cấp contract address sau khi deploy | Owner |
| Cung cấp `MINTER_PRIVATE_KEY` cho backend | Owner |

## 5. Thứ tự triển khai

| # | Việc | Phụ thuộc |
|---|---|---|
| 1 | Lưu ABI + config FUNMoneyMinter-2 vào codebase | Không |
| 2 | Edge Function `pplp-v2-onchain-mint` | Contract address + MINTER_PRIVATE_KEY |
| 3 | Hook `useLockedGrants` + UI release | Contract address |
| 4 | Cập nhật validate-action → auto-trigger on-chain mint | Bước 2 |
| 5 | Admin dashboard: preview split + processed actions | Bước 1 |

## Chi tiết kỹ thuật

- ABI mới hoàn toàn khác v1.2.1 — không dùng `lockWithPPLP`, `activate`, `claim`
- Thay vào đó: `mintValidatedAction`, `mintValidatedActionLocked`, `releaseLockedGrant`
- `_splitMint` on-chain đảm bảo 99/1 bất biến — backend không cần tính split
- `processedActionIds` mapping chống double-mint ở tầng contract

**Lưu ý quan trọng**: Bước 1 (lưu ABI/config) có thể làm ngay. Bước 2-5 cần owner deploy contract và cung cấp address + private key trước khi triển khai.

