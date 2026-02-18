

# Tinh nang Duyet lai giao dich On-chain chua ghi nhan

## Tong quan

Them tinh nang cho Admin de quet toan bo bang `transactions`, tim cac giao dich da on-chain nhung chua co trong bang `donations` (Gift History), va cho phep backfill chung tu dong.

## Cach hoat dong

1. Admin nhan nut "Quet giao dich thieu" trong tab Donations
2. He thong so sanh `transactions.tx_hash` voi `donations.tx_hash` de tim giao dich bi thieu
3. Map `to_address` voi `profiles.wallet_address` de xac dinh nguoi nhan
4. Hien thi danh sach giao dich thieu va cho admin xac nhan backfill
5. Insert vao bang `donations` voi status "confirmed"

## Chi tiet ky thuat

### 1. Tao Edge Function `backfill-donations`

File: `supabase/functions/backfill-donations/index.ts`

- Yeu cau admin auth (kiem tra `user_roles`)
- Co 2 mode:
  - `scan`: Tra ve danh sach giao dich trong `transactions` ma khong co trong `donations`, kem thong tin mapping wallet -> profile
  - `backfill`: Nhan danh sach transaction IDs, insert vao `donations`
- Logic mapping: JOIN `transactions.to_address` voi `profiles.wallet_address` (case-insensitive) de tim `recipient_id`
- Chi backfill nhung giao dich co the map duoc nguoi nhan (to_address khop voi 1 profile)
- Khong tao light_action, conversation, hay notification (vi da qua thoi gian)

### 2. Cap nhat Admin UI

File: `src/components/admin/DonationHistoryAdminTab.tsx`

Them vao header:
- Nut "Quet giao dich thieu" voi icon `ScanSearch`
- Khi nhan: goi edge function mode `scan`
- Hien dialog hien thi danh sach giao dich thieu (sender, recipient, amount, token, tx_hash)
- Nut "Backfill tat ca" de xac nhan insert

### 3. Cau truc du lieu backfill

Moi ban ghi donation duoc tao se co:
- `sender_id`: tu `transactions.user_id`
- `recipient_id`: tu mapping `to_address` -> `profiles.wallet_address`
- `amount`, `token_symbol`, `chain_id`, `tx_hash`: tu `transactions`
- `status`: "confirmed"
- `confirmed_at`: `transactions.created_at`
- `card_theme`: "celebration" (mac dinh)
- `card_sound`: "rich-1" (mac dinh)
- `message`: null
- `light_score_earned`: 0 (khong tinh diem cho backfill)

### Files can tao/sua:

1. `supabase/functions/backfill-donations/index.ts` -- tao moi
2. `supabase/config.toml` -- them config cho function moi (verify_jwt = false)
3. `src/components/admin/DonationHistoryAdminTab.tsx` -- them nut scan va dialog backfill

