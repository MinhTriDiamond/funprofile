

## Bo sung tin nhan chat tu dong khi claim thuong + ghi nhan giao dich thu cong

### Phan 1: Ghi nhan giao dich thu cong cho user daothianhnguyet.pt

Sau khi nhan duoc tx hash tu nguoi dung, se insert thu cong vao 3 bang:

1. **donations** -- ghi nhan giao dich gift voi sender la Treasury, recipient la user `ac174b69-1a24-4a9a-bf74-e448b9a754cf`
2. **transactions** -- ghi nhan trong lich su giao dich cua user
3. **notifications** -- gui thong bao cho user

Dong thoi tao conversation + message de hien thi trong chat.

### Phan 2: Bo sung tin nhan chat vao Edge Function `claim-reward`

Hien tai `claim-reward/index.ts` da ghi nhan vao `donations`, `transactions`, `notifications` nhung **KHONG** tao conversation va message trong chat. Can bo sung:

#### Cap nhat `supabase/functions/claim-reward/index.ts`

Them buoc 16d sau buoc 16c (dong ~550), tuong tu logic trong `record-donation`:

1. Tim conversation truc tiep (direct) giua Treasury va user
2. Neu chua co: tao conversation moi + 2 participant
3. Gui message voi noi dung: "FUN Profile Treasury da chuyen [amount] CAMLY ve vi cua ban! TX: [txHash]..."
4. Cap nhat donation record voi `conversation_id` va `message_id`

```text
// 16d. Create chat message for claim notification
const TREASURY_SENDER_ID = '9e702a6f-4035-4f30-9c04-f2e21419b37a';
let conversationId = null;
let messageId = null;

// Find existing direct conversation between Treasury and user
const { data: recipientConvs } = await supabaseAdmin
  .from('conversation_participants')
  .select('conversation_id')
  .eq('user_id', userId);

const recipientConvIds = (recipientConvs || []).map(r => r.conversation_id);

if (recipientConvIds.length > 0) {
  const { data: existingConv } = await supabaseAdmin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', TREASURY_SENDER_ID)
    .in('conversation_id', recipientConvIds);
  
  for (const conv of existingConv || []) {
    const { data: convData } = await supabaseAdmin
      .from('conversations')
      .select('id, type')
      .eq('id', conv.conversation_id)
      .eq('type', 'direct')
      .single();
    if (convData) { conversationId = convData.id; break; }
  }
}

if (!conversationId) {
  const { data: newConv } = await supabaseAdmin
    .from('conversations')
    .insert({ type: 'direct' })
    .select('id')
    .single();
  if (newConv) {
    conversationId = newConv.id;
    await supabaseAdmin.from('conversation_participants').insert([
      { conversation_id: conversationId, user_id: TREASURY_SENDER_ID, role: 'member' },
      { conversation_id: conversationId, user_id: userId, role: 'member' },
    ]);
  }
}

if (conversationId) {
  const messageContent = `FUN Profile Treasury da chuyen ${effectiveAmount.toLocaleString()} CAMLY ve vi cua ban!\n\nTX: ${txHash.slice(0, 18)}...\nXem chi tiet: https://bscscan.com/tx/${txHash}`;

  const { data: message } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: TREASURY_SENDER_ID,
      content: messageContent,
    })
    .select('id')
    .single();

  if (message) {
    messageId = message.id;
    // Update donation with conversation link
    await supabaseAdmin
      .from('donations')
      .update({ conversation_id: conversationId, message_id: messageId })
      .eq('tx_hash', txHash);
  }
}
```

### Phan 3: Cap nhat donation records cu (khong co conversation)

Doi voi cac giao dich claim truoc do (khoang 10 ban ghi hien tai co `conversation_id = null`), se KHONG hoi to cap nhat vi cac user da nhan duoc thong bao qua notification roi.

### Ket qua

- Cac lan claim thuong trong tuong lai se tu dong gui tin nhan chat tu Treasury den user
- User se thay tin nhan trong muc Chat voi noi dung va link BscScan
- Giao dich cua user `daothianhnguyet.pt` se duoc ghi nhan thu cong (can tx hash)
- Khong anh huong den cac chuc nang hien tai

### Luu y

Can nguoi dung cung cap **tx hash** cua giao dich da gui cho `daothianhnguyet.pt` de thuc hien Phan 1.
