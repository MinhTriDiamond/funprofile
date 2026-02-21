
# Sua loi Edge Function agora-token va Client

## Van de phat hien

### Loi 1: `getClaims()` khong ton tai
Edge function `agora-token` dung `supabase.auth.getClaims()` - method nay khong ton tai trong Supabase JS SDK. Can doi sang `supabase.auth.getUser()`.

### Loi 2: Body field name khong khop
- Client (`src/lib/agoraRtc.ts` dong 48) gui: `{ channel_name: channelName }`
- Edge function (`supabase/functions/agora-token/index.ts` dong 30) doc: `{ channelName, callType }`
- Ket qua: Edge function luon nhan `channelName = undefined` -> tra ve loi 400 "channelName required"

### Trang thai secrets: OK
- `AGORA_WORKER_URL` - da cau hinh
- `AGORA_WORKER_API_KEY` - da cau hinh

---

## Ke hoach sua

### Buoc 1: Sua `supabase/functions/agora-token/index.ts`
- Thay `supabase.auth.getClaims(...)` bang `supabase.auth.getUser()`
- Doi dong doc body tu `{ channelName }` thanh ho tro ca 2 format: `channelName` hoac `channel_name`

```
Dong 24-28: Doi getClaims -> getUser
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) { return 401 }
  const userId = user.id;

Dong 30: Ho tro ca 2 field name
  const body = await req.json();
  const channelName = body.channelName || body.channel_name;
```

### Buoc 2: Khong can sua client
File `src/lib/agoraRtc.ts` gui `channel_name` - edge function se ho tro ca 2 format nen khong can doi.

## Ket qua mong doi
- Edge function xac thuc user thanh cong bang `getUser()`
- Nhan dung `channelName` tu client
- Goi Cloudflare Worker va tra ve token cho client
- Video call va voice call hoat dong
