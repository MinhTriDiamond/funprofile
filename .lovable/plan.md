

## Kế hoạch: Xóa bỏ hoàn toàn tính năng Custodial Wallet

Tính năng custodial wallet đã không hoạt động (edge function không tồn tại). Cần dọn sạch tất cả references trong code.

---

### Phạm vi thay đổi

**Frontend (UI) — 5 files:**

| File | Thay đổi |
|---|---|
| `src/components/profile/ProfileHeader.tsx` | Xóa `custodial_wallet_address` khỏi fallback chain (dòng 50, 221) |
| `src/modules/chat/components/MessageThread.tsx` | Xóa `custodial_wallet_address` khỏi fallback (dòng 149) |
| `src/modules/chat/hooks/useConversations.ts` | Xóa `custodial_wallet_address` khỏi select query (dòng 55, 278) |
| `src/modules/chat/types/index.ts` | Xóa field `custodial_wallet_address` (dòng 11) |
| `src/hooks/useProfile.ts` | Xóa field `custodial_wallet_address` (dòng 26) |

**Docs (UI) — 3 files:**

| File | Thay đổi |
|---|---|
| `src/pages/EcosystemDocs.tsx` | Xóa/sửa toàn bộ section về Custodial Wallet, xóa references đến `create-custodial-wallet`, `custodial_wallets` table |
| `src/pages/PlatformDocs.tsx` | Xóa section tạo custodial wallet, xóa row trong bảng tables/functions |
| `src/components/docs/AppDiagrams.tsx` | Xóa box "Tạo Custodial Wallet" và `create-custodial-wallet` trong diagram |

**Edge Functions — 10 files:**

| File | Thay đổi |
|---|---|
| `sso-register/index.ts` | Xóa block gọi `create-custodial-wallet` (dòng 179-195), xóa `custodial_wallet_address` từ select |
| `sso-refresh/index.ts` | Xóa `custodial_wallet_address` từ select, set `custodial_wallet: null` |
| `sso-verify/index.ts` | Xóa `custodial_wallet_address` từ select và response |
| `sso-web3-auth/index.ts` | Xóa `custodial_wallet_address` từ select queries |
| `backfill-donations/index.ts` | Xóa `custodial_wallet_address` từ select và walletMap |
| `auto-backfill-donations/index.ts` | Xóa `custodial_wallet_address` từ select và walletMap |
| `backfill-tx-donations/index.ts` | Xóa `custodial_wallet_address` từ select và addrs array |
| `backfill-reward-claims/index.ts` | Xóa `custodial_wallet_address` từ fallback chain |
| `check-transaction/index.ts` | Xóa `custodial_wallet_address` từ `.or()` filter |
| `batch-ban-users/index.ts` | Xóa block query `custodial_wallets` table |
| `admin-delete-user/index.ts` | Xóa `custodial_wallets` từ cleanup tables list |
| `delete-user-account/index.ts` | Xóa `custodial_wallets` từ cleanup tables list |
| `batch-delete-banned-users/index.ts` | Xóa `custodial_wallets` từ cleanup tables list |

**Shared — 1 file:**

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/jwt.ts` | Xóa `custodial_wallet` field từ `AccessTokenClaims` interface và JWT payload |

**SDK — 1 file:**

| File | Thay đổi |
|---|---|
| `sdk-package/src/FunProfileClient.ts` | Xóa `custodialWalletAddress` mapping |

---

### KHÔNG xóa

- **Bảng `custodial_wallets` trong DB**: Giữ lại dữ liệu 241 ví hiện có cho mục đích archive. Không tạo migration xóa table.
- **Cột `custodial_wallet_address` trong profiles**: Giữ lại trong DB (có dữ liệu), chỉ xóa references trong code. Nếu cần xóa cột sau này sẽ làm riêng.
- **File `types.ts`**: Không sửa (auto-generated).

---

### Tóm tắt

Tổng cộng ~20 files cần sửa, phần lớn là xóa vài dòng reference. Không có thay đổi DB schema. Tập trung vào:
1. Xóa tất cả logic tạo/đọc custodial wallet trên UI
2. Xóa references trong edge functions (giữ functions hoạt động bình thường)
3. Cập nhật docs cho chính xác

