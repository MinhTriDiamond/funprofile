

# Tu dong dang bai chuc mung khi user rut thuong (Claim Reward)

## Hien trang
- **Tang qua (Donation)**: DA CO bai dang tu dong loai `gift_celebration` tren Feed - khong can thay doi.
- **Rut thuong (Claim Reward)**: CHUA CO bai dang tu dong. Can bo sung.

## Thay doi

### File: `supabase/functions/claim-reward/index.ts`
Them doan tao bai dang tu dong sau buoc 17b (notification), truoc buoc 18 (return):

- Tao bai dang loai `gift_celebration` voi noi dung: "🎉 @username da nhan thuong [so luong] CAMLY tu FUN Profile Treasury! ❤️"
- Ghim bai dang (highlight) trong 15 phut
- Visibility: public, moderation: approved
- Su dung `TREASURY_SENDER_ID` lam `gift_sender_id` va `userId` lam `gift_recipient_id`

### Chi tiet ky thuat

Them khoang 20 dong code vao `claim-reward/index.ts` (sau dong 666, truoc dong 668):

```typescript
// 17c. Create celebration post on feed
try {
  const claimUsername = profile.username || profile.full_name || 'Nguoi dung';
  const celebrationContent = `🎉 @${claimUsername} da nhan thuong ${effectiveAmount.toLocaleString()} CAMLY tu FUN Profile Treasury! ❤️`;

  await supabaseAdmin.from('posts').insert({
    user_id: userId,
    content: celebrationContent,
    post_type: 'gift_celebration',
    tx_hash: txHash,
    gift_sender_id: TREASURY_SENDER_ID,
    gift_recipient_id: userId,
    gift_token: 'CAMLY',
    gift_amount: effectiveAmount.toString(),
    gift_message: `Claim ${effectiveAmount.toLocaleString()} CAMLY`,
    is_highlighted: true,
    highlight_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    visibility: 'public',
    moderation_status: 'approved',
  });
} catch (postError) {
  console.error('Failed to create celebration post (non-blocking):', postError);
}
```

## Tong ket
- Chi can sua **1 file**: `supabase/functions/claim-reward/index.ts`
- Bai dang se hien thi giong hiet bai tang qua: card gradient xanh la, avatar nguoi gui (Treasury) va nguoi nhan, hieu ung RICH, phao hoa
- Bai dang duoc ghim 15 phut dau Feed
- Loi tao bai dang khong anh huong den quy trinh rut thuong (non-blocking)

