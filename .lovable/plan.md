

# Tự động tạo hình ảnh chúc mừng và đăng lên trang cá nhân người nhận

## Tổng quan

Khi người dùng tặng quà hoặc rút thưởng CAMLY, hệ thống sẽ tự động:
1. Tạo hình ảnh chúc mừng (celebration card) bằng AI
2. Upload lên Cloudflare R2
3. Đính kèm hình ảnh vào bài đăng gift_celebration trên Feed
4. Đính kèm hình ảnh vào tin nhắn chat gửi cho người nhận

## Giải pháp

### Bước 1: Tạo Edge Function mới `generate-celebration-image`

Tạo file `supabase/functions/generate-celebration-image/index.ts`:

- Nhận thông tin giao dịch: sender_username, recipient_username, amount, token_symbol, tx_hash
- Gọi Lovable AI Gateway (google/gemini-2.5-flash-image) để tạo hình ảnh chúc mừng với nội dung:
  - Logo FUN Profile
  - Ten nguoi gui va nguoi nhan
  - So luong token
  - Thoi gian giao dich
  - Thiet ke gradient xanh la voi hieu ung long lanh
- Upload hinh anh (base64 -> bytes) len Cloudflare R2 thu muc `celebrations/`
- Tra ve URL hinh anh

### Buoc 2: Cap nhat `record-donation/index.ts`

Sau khi tao bai dang gift_celebration (dong 262-276), goi edge function `generate-celebration-image` de tao hinh anh, sau do:
- Cap nhat bai dang voi `image_url` = URL hinh anh tu R2
- Cap nhat tin nhan chat voi `media_urls` bao gom hinh anh celebration

### Buoc 3: Cap nhat `claim-reward/index.ts`

Tuong tu, sau khi tao bai dang celebration (dong 673-687):
- Goi function tao hinh anh
- Cap nhat bai dang va tin nhan chat voi hinh anh

### Buoc 4: Cap nhat `GiftCelebrationCard.tsx`

Hien thi hinh anh celebration trong card neu `image_url` co san, tao giao dien dep hon va co dinh (khong mat di).

---

## Chi tiet ky thuat

### Edge Function: `generate-celebration-image`

```
POST /generate-celebration-image
Body: {
  sender_username: string,
  recipient_username: string, 
  amount: string,
  token_symbol: string,
  tx_hash: string,
  type: "gift" | "claim"
}
Response: { image_url: string }
```

Logic:
1. Tao prompt cho AI: "Generate a beautiful celebration card image with green gradient background, golden sparkles. Show: [sender] sent [amount] [token] to [recipient]. Include FUN Profile branding. Professional, festive design."
2. Goi Lovable AI Gateway voi model `google/gemini-2.5-flash-image` va `modalities: ["image", "text"]`
3. Nhan base64 image tu response
4. Upload len R2 tai `celebrations/{timestamp}-{random}.png`
5. Tra ve public URL

### Thay doi `record-donation/index.ts`

Sau dong 276 (sau khi insert post), them:
```typescript
// Generate celebration image
let celebrationImageUrl = null;
try {
  const imgRes = await fetch(`${supabaseUrl}/functions/v1/generate-celebration-image`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}` 
    },
    body: JSON.stringify({
      sender_username: senderName,
      recipient_username: recipientName,
      amount: body.amount,
      token_symbol: body.token_symbol,
      tx_hash: body.tx_hash,
      type: 'gift'
    })
  });
  const imgData = await imgRes.json();
  celebrationImageUrl = imgData.image_url;
  
  // Update post with image
  if (celebrationImageUrl) {
    await supabase.from('posts')
      .update({ image_url: celebrationImageUrl })
      .eq('tx_hash', body.tx_hash)
      .eq('post_type', 'gift_celebration');
  }
} catch (e) {
  console.error('Image generation failed (non-blocking):', e);
}
```

Tuong tu cho tin nhan chat: them hinh anh vao `media_urls`.

### Thay doi `claim-reward/index.ts`

Them logic tuong tu sau dong 687, goi `generate-celebration-image` va cap nhat post + chat message.

### Thay doi `GiftCelebrationCard.tsx`

Them hien thi hinh anh trong card:
- Neu `post.image_url` ton tai, hien thi hinh anh celebration ben trong card
- Hinh anh se la bang chung vinh vien cua giao dich

### Tong ket cac file can tao/sua

| File | Thao tac |
|------|----------|
| `supabase/functions/generate-celebration-image/index.ts` | Tao moi - Edge function tao hinh AI |
| `supabase/functions/record-donation/index.ts` | Sua - Goi tao hinh va cap nhat post/chat |
| `supabase/functions/claim-reward/index.ts` | Sua - Goi tao hinh va cap nhat post/chat |
| `src/components/feed/GiftCelebrationCard.tsx` | Sua - Hien thi hinh anh celebration |
| `supabase/config.toml` | Tu dong cap nhat khi deploy |

### Luu y
- Viec tao hinh anh la non-blocking: neu that bai, giao dich van thanh cong binh thuong
- Hinh anh duoc luu vinh vien tren R2, bai dang va chat se luon co hinh
- Su dung `LOVABLE_API_KEY` (da co san) de goi AI Gateway
- Hinh anh ~500KB-1MB, upload nhanh qua R2

