

# Phục hồi 33 giao dịch Treasury bị thiếu (6,918,000 CAMLY)

## Tình trạng hiện tại
- On-chain: 98,188,999 CAMLY (273 giao dịch outgoing)
- Database donations: 91,320,999 CAMLY (241 records)
- Thiếu: 33 giao dịch = 6,918,000 CAMLY
- Tất cả 33 giao dịch thiếu KHONG map duoc voi bat ky user nao (dia chi vi khong con trong he thong)

## Giai phap

### Buoc 1: Mo rong wallet mapping trong `scan-treasury-outgoing`
Hien tai function chi tim user qua `profiles.wallet_address` va `profiles.public_wallet_address` + `custodial_wallets`. Can bo sung them:
- `profiles.external_wallet_address`  
- `profiles.custodial_wallet_address`
- `reward_claims.wallet_address` (dia chi vi luc user claim, co the khac voi wallet hien tai)

### Buoc 2: Cho phep backfill giao dich "unmappable"
Voi nhung giao dich khong the map duoc user, van insert vao `donations` voi:
- `recipient_id = null`
- `sender_id = Treasury ID`
- `metadata = { source: "backfill_unmapped", to_address: "0x..." }`
- `status = "confirmed"`
- Day la cac giao dich on-chain co that, chi la khong xac dinh duoc user nhan

### Buoc 3: Chay backfill ngay 33 giao dich hien tai
Goi `scan-treasury-outgoing` voi `mode: "backfill"` de insert 33 giao dich con thieu, dam bao tong so = 98,188,999 CAMLY

## Chi tiet ky thuat

### Thay doi trong `scan-treasury-outgoing`:
1. Bo sung mapping `external_wallet_address` va `custodial_wallet_address` tu bang `profiles`
2. Bo sung mapping tu `reward_claims.wallet_address` -> `user_id`
3. Trong mode backfill: insert CA giao dich unmappable (recipient_id = null) thay vi chi insert mappable
4. Them truong `is_unmapped: true` trong metadata de phan biet

### Thay doi schema:
- Kiem tra rang `donations.recipient_id` cho phep null (neu chua thi can migration)
- Khong can tao bang moi

### Ket qua mong doi:
- Tong donations tu Treasury = 98,188,999 CAMLY (khop voi on-chain)
- 33 giao dich thieu se duoc ghi nhan day du voi tx_hash, amount, timestamp
- Cac giao dich unmapped se co metadata de admin co the review sau

