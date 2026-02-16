

# Fix: Edge Function record-donation chua deploy va bug bien senderProfile

## Van de goc
1. **Edge function `record-donation` chua duoc deploy lai** sau khi them code tao gift_celebration post. Phien ban dang chay tren server la phien ban cu (khong co logic tao post). Do do donations van duoc ghi nhung khong co gift_celebration post nao duoc tao.

2. **Bug scope bien `senderProfile`**: Bien `senderProfile` duoc khai bao ben trong block `if (conversationId)` (dong 193) nhung lai duoc su dung ben ngoai block do (dong 235). Neu khong co conversation nao, bien nay se la `undefined`.

## Giai phap

### 1. Fix bug scope bien senderProfile
- Di chuyen viec fetch `senderProfile` len TRUOC khi tao conversation, de no co the duoc dung o ca 2 noi (message content va gift celebration post).

### 2. Deploy lai edge function
- Sau khi fix code, deploy lai `record-donation` de phien ban moi (co logic tao gift_celebration post) duoc ap dung.

## Chi tiet ky thuat

### File sua: `supabase/functions/record-donation/index.ts`

**Truoc** (dong ~192-235):
```text
// Code hien tai: senderProfile nam trong block if(conversationId)
if (conversationId) {
  const { data: senderProfile } = await supabase...  // <-- chi co trong block nay
  ...
}
// Ben ngoai: senderProfile khong ton tai
const senderName = senderProfile?.username || "Nguoi dung";
```

**Sau**:
```text
// Fetch senderProfile TRUOC - dung cho ca message va post
const { data: senderProfile } = await supabase
  .from("profiles")
  .select("username")
  .eq("id", body.sender_id)
  .single();

if (conversationId) {
  // Dung senderProfile o day cho message content
  ...
}
// Va dung lai o day cho gift celebration post
const senderName = senderProfile?.username || "Nguoi dung";
```

### Deploy
- Deploy lai edge function `record-donation` sau khi fix

## Thu tu thuc hien
1. Fix scope bien senderProfile trong record-donation/index.ts
2. Deploy edge function record-donation
3. Kiem tra logs de xac nhan hoat dong

