

# Gói tích hợp Multisig 3-of-3 cho FUN Play va ANGEL AI

## Muc tieu

Tao file tai lieu dong goi day du tinh nang Multisig GOV-COMMUNITY (WILL + WISDOM + LOVE) de cac platform FUN Play va ANGEL AI co the trien khai tuong tu tren he thong cua ho.

## Cac file can tao

### 1. `pdk/docs/MULTISIG_INTEGRATION_GUIDE.md`
Tai lieu huong dan tich hop chinh, bao gom:

- **Tong quan kien truc**: Giai thich co che 3-of-3 Multisig voi 3 nhom GOV (WILL, WISDOM, LOVE), moi nhom can 1 chu ky
- **Smart Contract**: Dia chi contract FUN Money (`0x39A1...`), chain BSC Testnet (97), EIP-712 domain config
- **Luong hoat dong end-to-end** (so do ASCII):
  1. User tao mint request (goi Edge Function `pplp-mint-fun`)
  2. Admin/Attester ky tuan tu (EIP-712 off-chain signing)
  3. Du 3 chu ky -> Submit on-chain (`lockWithPPLP`)
  4. Auto-confirm khi TX thanh cong
- **Database schema**: Bang `pplp_mint_requests` voi cac cot multisig
- **EIP-712 PureLoveProof struct**: Cau truc chinh xac phai khop voi contract
- **GOV Groups config**: Danh sach 11 thanh vien, 3 nhom
- **Contract ABI**: `lockWithPPLP`, `nonces`, `isAttester`, `alloc`, `actions`
- **Bao mat**: RLS policies, nonce verification, anti-duplicate checks

### 2. `pdk/core/multisig/pplp-config.ts`
File config portable (khong phu thuoc vao framework cu the):
- `FUN_MONEY_CONTRACT`, `EIP712_DOMAIN`, `EIP712_PPLP_TYPES`
- `GOV_GROUPS` voi danh sach thanh vien
- Helper functions: `getGovGroupForAddress()`, `getGovMemberName()`, `isAttesterAddress()`
- `toWei()`, `fromWei()`, `formatFUN()`
- Mint request status constants

### 3. `pdk/core/multisig/pplp-eip712.ts`
Shared EIP-712 config cho Edge Functions (Deno compatible):
- Copy tu `supabase/functions/_shared/pplp-eip712.ts`
- Bao gom contract ABI, attester addresses, BSC RPC endpoints

### 4. `pdk/core/multisig/pplp-crypto.ts`
Shared crypto utilities (Deno compatible):
- `sha256()`, `generateEvidenceHash()`, `generateCanonicalHash()`, `hashForEvidence()`

### 5. `pdk/core/multisig/pplp-types.ts`
Shared types va constants:
- Action types, base rewards, platforms, pillars, score ranges
- `CascadeDistribution` calculator
- Interfaces: `LightAction`, `PPLPScore`, `MintRequest`, `FraudSignal`

### 6. `pdk/core/multisig/edge-functions/pplp-mint-fun.ts`
Template Edge Function tao mint request:
- Nhan `action_ids` tu user
- Tinh toan amount, lay nonce tu contract, tao evidence hash
- Insert vao `pplp_mint_requests` voi status `pending_sig`
- Anti-duplicate, daily cap, epoch cap checks

### 7. `pdk/core/multisig/database/migration.sql`
SQL migration tao bang `pplp_mint_requests`:
- Schema day du voi cac cot multisig (`multisig_signatures JSONB`, `multisig_completed_groups TEXT[]`, `multisig_required_groups TEXT[]`)
- RLS policies (attester chi thay `signing`/`signed`, user thay request cua minh)
- Function `is_gov_attester()` ho tro ca UUID va wallet address
- Enable realtime

### 8. `pdk/core/multisig/hooks/useAttesterSigning.ts`
React hook template cho Attester ky request:
- Detect GOV group tu connected wallet
- Fetch pending requests, realtime subscription
- EIP-712 signing flow voi auto chain switch
- Update DB voi chu ky moi

### 9. `pdk/core/multisig/hooks/useMintSubmit.ts`
React hook template cho Admin submit on-chain:
- Kiem tra du 3 chu ky
- Nonce verification truoc khi submit
- Goi `lockWithPPLP` voi 3 signatures theo thu tu [WILL, WISDOM, LOVE]
- Auto-confirm polling

## Chi tiet ky thuat

- Tat ca file deu la **standalone**, khong import tu `@/` paths
- Tai lieu viet bang **tieng Viet co dau** kem tieng Anh cho cac thuat ngu ky thuat
- Bao gom **checklist trien khai** de FUN Play / ANGEL AI follow
- Ghi chu ro cac buoc can lam tren Cloudflare/contract (register attester, register action)

