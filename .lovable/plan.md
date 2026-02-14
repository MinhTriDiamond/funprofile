

# Hien thi giao dich Claim trong Lich su giao dich

## Van de
Khi nguoi dung claim CAMLY thanh cong, edge function `claim-reward` ghi vao bang `transactions` va `reward_claims`, nhung KHONG ghi vao bang `donations`. Trang lich su giao dich (`/donations`) chi truy van bang `donations`, nen giao dich claim khong hien thi.

## Giai phap
Them mot buoc ghi vao bang `donations` trong edge function `claim-reward` sau khi giao dich blockchain thanh cong. Dieu nay dam bao giao dich claim xuat hien trong lich su giao dich cua he thong.

## Chi tiet ky thuat

### File: `supabase/functions/claim-reward/index.ts`

Sau buoc 16 (ghi vao `transactions`), them buoc ghi vao bang `donations`:

```typescript
// 16b. Record in donations table for history visibility
const TREASURY_SENDER_ID = '9e702a6f-4035-4f30-9c04-f2e21419b37a';
const { error: donationInsertError } = await supabaseAdmin
  .from('donations')
  .insert({
    sender_id: TREASURY_SENDER_ID,
    recipient_id: userId,
    amount: effectiveAmount.toString(),
    token_symbol: 'CAMLY',
    token_address: CAMLY_CONTRACT.toLowerCase(),
    chain_id: 56,
    tx_hash: txHash,
    status: 'confirmed',
    block_number: Number(receipt.blockNumber),
    message: `Claim ${effectiveAmount.toLocaleString()} CAMLY tu phan thuong`,
    light_score_earned: 0,
    confirmed_at: new Date().toISOString(),
    metadata: { type: 'claim_reward' },
  });

if (donationInsertError) {
  console.error('Failed to insert donation record:', donationInsertError);
}
```

- `sender_id`: Su dung Treasury actor ID (da co san trong code)
- `recipient_id`: ID cua nguoi dung claim
- `metadata`: Danh dau `{ type: 'claim_reward' }` de phan biet voi giao dich tang thuong thong thuong
- `light_score_earned`: 0 (claim khong tang diem)

Sau do redeploy edge function `claim-reward`.

