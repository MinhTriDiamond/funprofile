
# Sửa lỗi giao dịch bị thiếu trong Donation và Gift

## Van de
Hien tai he thong co **1000/1000 giao dich** bi thieu ban ghi donation. Nguyen nhan chinh:

1. **Backfill chi quet 1000 giao dich gan nhat** (`.limit(1000)`) -- cac giao dich cu hon se khong bao gio duoc phuc hoi
2. **Anh xa nguoi nhan chua day du** -- chi kiem tra `wallet_address` va `public_wallet_address`, thieu `external_wallet_address` va `custodial_wallet_address`
3. **record-donation** co the that bai do timeout mang hoac loi khac, va backfill khong du kha nang xu ly het

## Giai phap

### 1. Nang cap `auto-backfill-donations` edge function
- **Phan trang**: Thay vi `.limit(1000)`, su dung vong lap phan trang de quet **tat ca** giao dich confirmed
- **Mo rong wallet map**: Them `external_wallet_address` va `custodial_wallet_address` vao ban do anh xa nguoi nhan
- **Batch insert**: Chia nho cac ban ghi can insert de tranh timeout

### 2. Cap nhat `backfill-donations` edge function
- Cung cap nhat wallet mapping tuong tu

### Chi tiet ky thuat

#### File: `supabase/functions/auto-backfill-donations/index.ts`

**Thay doi 1 - Phan trang transactions (dong 29-34):**
Thay `.limit(1000)` bang vong lap phan trang, moi lan lay 1000 ban ghi cho den khi het:
```typescript
const PAGE_SIZE = 1000;
let allTx: any[] = [];
let offset = 0;
let hasMore = true;
while (hasMore) {
  const { data: batch } = await adminClient
    .from("transactions")
    .select("id, user_id, tx_hash, from_address, to_address, amount, token_symbol, token_address, chain_id, created_at")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (!batch || batch.length === 0) { hasMore = false; break; }
  allTx = allTx.concat(batch);
  if (batch.length < PAGE_SIZE) hasMore = false;
  else offset += PAGE_SIZE;
}
```

**Thay doi 2 - Mo rong wallet mapping (dong 49-59):**
Them 2 truong dia chi vi bo sung:
```typescript
const { data: profiles } = await adminClient
  .from("profiles")
  .select("id, username, display_name, avatar_url, wallet_address, public_wallet_address, external_wallet_address, custodial_wallet_address");

for (const p of profiles || []) {
  profileMap.set(p.id, { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url });
  if (p.wallet_address) walletMap.set(p.wallet_address.toLowerCase(), p.id);
  if (p.public_wallet_address) walletMap.set(p.public_wallet_address.toLowerCase(), p.id);
  if (p.external_wallet_address) walletMap.set(p.external_wallet_address.toLowerCase(), p.id);
  if (p.custodial_wallet_address) walletMap.set(p.custodial_wallet_address.toLowerCase(), p.id);
}
```

**Thay doi 3 - Phan trang donations (dong 62-67):**
Tuong tu, phan trang khi lay donations de kiem tra posts thieu.

**Thay doi 4 - Batch insert donations (dong 175-178):**
Chia nho mang `toInsert` thanh cac batch 100 ban ghi de tranh timeout:
```typescript
for (let i = 0; i < toInsert.length; i += 100) {
  const batch = toInsert.slice(i, i + 100);
  const { error } = await adminClient.from("donations").insert(batch);
  if (error) console.error("Batch insert error:", error.message);
  else insertedCount += batch.length;
}
```

#### File: `supabase/functions/backfill-donations/index.ts`
- Ap dung cung cac thay doi wallet mapping mo rong

### Ket qua mong doi
- Tat ca giao dich (khong gioi han 1000) se duoc quet va phuc hoi
- Nhieu nguoi nhan hon se duoc xac dinh nho kiem tra 4 loai dia chi vi
- Giao dich 20 USDT cua angelanhnguyet -> UtopiaThuy413 se duoc phuc hoi sau khi chay Backfill
