

## Ke hoach: Doi soat Treasury va cap nhat so tong da chi

### Van de
- Treasury nhan: 180,000,000 CAMLY
- So du hien tai trong vi: 81,811,001 CAMLY
- Tong chi thuc te on-chain: **98,188,999 CAMLY**
- Database chi ghi nhan: **91,320,999 CAMLY** (reward_claims + donations)
- **Thieu 6,868,000 CAMLY** chua duoc ghi nhan trong database

### Giai phap

#### Buoc 1: Tao Edge Function quet giao dich CAMLY di ra tu Treasury
Tao edge function `scan-treasury-outgoing` su dung Moralis API (da co MORALIS_API_KEY) de:
- Quet tat ca giao dich chuyen CAMLY tu Treasury wallet ra ngoai tren BSC Mainnet
- So sanh voi du lieu trong `reward_claims` va `donations`
- Tra ve danh sach cac giao dich thieu (chua duoc ghi nhan)

#### Buoc 2: Backfill cac giao dich thieu vao database
- Cac giao dich thieu se duoc ghi nhan vao bang `donations` voi metadata ghi chu "backfill from on-chain"
- Map `to_address` voi `wallet_address` trong `profiles` de xac dinh nguoi nhan

#### Buoc 3: Cap nhat `total_camly_claimed` trong `get_app_stats`
Sua RPC `get_app_stats` de tinh `total_camly_claimed` = tong tat ca giao dich chi tu Treasury (bao gom ca `reward_claims` va `donations` tu Treasury), hoac don gian hon:
- Cap nhat gia tri `total_camly_claimed` = `TREASURY_CAMLY_RECEIVED - so du hien tai` = 98,188,999

#### Buoc 4: Cap nhat `system_config`
Them key `TREASURY_CAMLY_SPENT` = 98,188,999 vao `system_config` de theo doi chinh xac tong chi, hoac sua cong thuc tinh `total_camly_claimed` trong RPC thanh:
```text
total_camly_claimed = SUM(reward_claims.amount) + SUM(donations tu Treasury)
```

### Chi tiet ky thuat

**Edge Function `scan-treasury-outgoing`**:
- Su dung Moralis API: `GET /v2/{treasury_address}/erc20/transfers?contract_addresses[]={CAMLY_CONTRACT}&direction=outgoing`
- So sanh tx_hash voi `donations.tx_hash` va tim cac giao dich thieu
- Tra ve summary: tong on-chain, tong DB, chenh lech, danh sach giao dich thieu

**Cap nhat `get_app_stats` RPC**:
- `total_camly_claimed` = tong tu `reward_claims` + tong `donations` tu Treasury (sender_id = '9e702a6f-...')
- Cong thuc moi se phan anh chinh xac tong CAMLY da chi tu Treasury

**Uu diem**:
- Tu dong phat hien giao dich thieu thong qua on-chain data
- Backfill vao DB de dam bao du lieu nhat quan
- Honor Board hien thi so lieu chinh xac

