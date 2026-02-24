

# Sua loi giao dich bi thieu trong Lich su va tat ca cac muc

## Nguyen nhan goc

### 1. Gui bang Vi (useSendToken) KHONG tao donation record
Khi nguoi dung gui token bang tab "Vi" (khong phai Gift), he thong chi tao ban ghi trong bang `transactions`. Edge function `record-donation` KHONG duoc goi. Do do, giao dich nay se khong xuat hien trong:
- Lich su Gift/Donation (ca nhan va toan he thong)
- Feed bai chuc mung
- Trang /donations

### 2. Backfill that bai hoan toan (Inserted: 0)
Log cho thay: `Scanned: 1003, Missing: 1000, Inserted: 0, Skipped: 19`

Nguyen nhan:
- **Kiem tra trung lap bi gioi han 1000 dong**: Khi kiem tra xem tx_hash nao da co donation, truy van `.in("tx_hash", batch)` bi gioi han 1000 ket qua boi PostgREST. Ket qua la nhieu donation da ton tai KHONG duoc tim thay, khien he thong tuong la "thieu" va co insert lai -> loi `duplicate key`.
- **Vi tu gui cho minh**: Mot so giao dich co `to_address` anh xa lai chinh nguoi gui, vi pham constraint `no_self_donation`.
- **Batch insert that bai toan bo**: Khi 1 dong trong batch loi, toan bo batch 100 dong bi huy.

### 3. Stats trang /donations gioi han 1000 dong
`useAdminDonationHistory` stats query lay tat ca donations khong phan trang, bi cat o 1000 dong.

## Giai phap

### Thay doi 1: `supabase/functions/auto-backfill-donations/index.ts`
- **Phan trang kiem tra trung lap**: Khi kiem tra tx_hash da co donation, phan trang truy van de khong bi gioi han 1000 dong
- **Bo qua self-donation**: Kiem tra sender_id != recipient_id truoc khi insert
- **Insert tung dong thay vi batch**: Su dung vong lap insert tung dong voi `ON CONFLICT DO NOTHING` (thong qua upsert) de tranh 1 dong loi huy toan bo batch
- **Ghi log chi tiet hon**: Log so dong thuc su duoc insert, skip va loi

### Thay doi 2: `src/hooks/useAdminDonationHistory.ts`
- **Stats su dung RPC hoac phan trang**: Thay vi select tat ca donations (bi gioi han 1000), su dung aggregate query truc tiep trong database de tinh tong chinh xac

### Thay doi 3: `supabase/functions/check-transaction/index.ts`
- **Mo rong kiem tra wallet**: Them `external_wallet_address` va `custodial_wallet_address` vao truy van tim nguoi nhan

### Thay doi 4: Tao database function cho stats
- Tao RPC function `get_donation_system_stats` de tinh tong truc tiep trong database, tranh gioi han 1000 dong

## Chi tiet ky thuat

### File 1: `supabase/functions/auto-backfill-donations/index.ts`

**Sua kiem tra trung lap (dong 103-115):**
Thay vi kiem tra 1 batch lon, phan trang kiem tra tung batch nho (100 tx_hash moi lan):
```typescript
const existingDonationSet = new Set<string>();
const LOOKUP_BATCH = 100;
for (let i = 0; i < txHashes.length; i += LOOKUP_BATCH) {
  const batch = txHashes.slice(i, i + LOOKUP_BATCH);
  const { data: existing } = await adminClient
    .from("donations")
    .select("tx_hash")
    .in("tx_hash", batch);
  for (const d of existing || []) {
    if (d.tx_hash) existingDonationSet.add(d.tx_hash);
  }
}
```

**Sua insert donations (dong 206-216):**
Thay batch insert bang insert tung dong voi skip loi:
```typescript
let insertedCount = 0;
let errorCount = 0;
for (const record of toInsert) {
  // Skip self-donation
  if (record.sender_id === record.recipient_id) {
    skipped.push(record.tx_hash);
    continue;
  }
  const { error } = await adminClient
    .from("donations")
    .upsert(record, { onConflict: 'tx_hash', ignoreDuplicates: true });
  if (error) {
    errorCount++;
    console.error(`Insert error for ${record.tx_hash}:`, error.message);
  } else {
    insertedCount++;
  }
}
```

### File 2: `src/hooks/useAdminDonationHistory.ts`

**Sua stats query (dong 156-194):**
Thay select tat ca bang truy van aggregate:
```typescript
// Count total
const { count: totalCount } = await supabase
  .from('donations')
  .select('id', { count: 'exact', head: true });

// Count by status  
const { count: confirmedCount } = await supabase
  .from('donations')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'confirmed');

// v.v. cho tung chi so
```

### File 3: `supabase/functions/check-transaction/index.ts`

**Mo rong wallet lookup (dong 72-76):**
Them external_wallet_address va custodial_wallet_address:
```typescript
.or(`wallet_address.ilike.${addr},public_wallet_address.ilike.${addr},external_wallet_address.ilike.${addr},custodial_wallet_address.ilike.${addr}`)
```

### Ket qua mong doi
- Backfill se thuc su insert duoc cac donation bi thieu (khong con loi duplicate key hay self-donation)
- Tat ca giao dich cu (bao gom 20 USDT cua angelanhnguyet -> UtopiaThuy413) se duoc phuc hoi sau khi chay Backfill
- Stats trang /donations se hien thi so lieu chinh xac (khong bi gioi han 1000)
- Cac giao dich da phuc hoi se tu dong xuat hien tren: Gift/Donations, Feed, Trang /donations, va ca muc Wallet (thong qua bang donations)

