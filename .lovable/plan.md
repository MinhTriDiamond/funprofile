

# Ngan chan user bi ghi nhan gian lan chuyen/rut token

## Van de
Hien tai, khi user bi dat trang thai `on_hold` hoac `banned`, ho khong the **claim thuong** (da co kiem tra trong `claim-reward`). Nhung ho van co the:
1. **Chuyen token noi bo** (Send Token) qua trang Vi - gui CAMLY/BNB cho nick khac
2. **Tang qua** (Donation) - gui token cho nguoi khac qua tinh nang Gift

Nhu vay, user gian lan co the chuyen het token tu nick bi khoa sang nick khac de rut.

## Giai phap

### 1. Chan o backend: Edge function `record-donation`
Them kiem tra `reward_status` va `is_banned` cua sender truoc khi ghi nhan donation. Neu user bi `on_hold`, `banned`, hoac `rejected` thi tu choi giao dich.

### 2. Chan o frontend: `useSendToken.ts`
Truoc khi gui giao dich on-chain, kiem tra trang thai user tu database. Neu bi chan thi hien thong bao va khong cho gui.

### 3. Chan o frontend: `useDonation.ts`
Tuong tu, kiem tra trang thai user truoc khi thuc hien donation.

### 4. Chan o frontend: `UnifiedGiftSendDialog.tsx`
Hien thi thong bao canh bao ngay khi mo dialog neu user bi han che.

## Chi tiet ky thuat

### File 1: `supabase/functions/record-donation/index.ts`
Them doan kiem tra sau khi xac thuc user (dong 50-66):

```typescript
// Check sender profile status - block banned/on_hold users
const { data: senderStatus } = await supabase
  .from('profiles')
  .select('reward_status, is_banned')
  .eq('id', user.id)
  .single();

if (senderStatus?.is_banned) {
  return new Response(
    JSON.stringify({ error: 'Tai khoan da bi cam. Khong the thuc hien giao dich.' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

if (['on_hold', 'rejected', 'banned'].includes(senderStatus?.reward_status)) {
  return new Response(
    JSON.stringify({ error: 'Tai khoan dang bi han che. Vui long lien he Admin.' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### File 2: `src/hooks/useSendToken.ts`
Them ham kiem tra trang thai user truoc khi gui giao dich:

```typescript
// Truoc dong "setIsProcessing(true)" trong sendToken():
const { data: { user: currentUser } } = await supabase.auth.getUser();
if (currentUser) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('reward_status, is_banned')
    .eq('id', currentUser.id)
    .single();

  if (profile?.is_banned || ['on_hold', 'rejected', 'banned'].includes(profile?.reward_status)) {
    toast.error('Tai khoan dang bi han che. Khong the chuyen token. Vui long lien he Admin.');
    return null;
  }
}
```

### File 3: `src/hooks/useDonation.ts`
Them kiem tra tuong tu truoc khi gui donation:

```typescript
// Truoc dong "setIsProcessing(true)" trong donate():
const { data: { user: currentUser } } = await supabase.auth.getUser();
if (currentUser) {
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('reward_status, is_banned')
    .eq('id', currentUser.id)
    .single();

  if (senderProfile?.is_banned || ['on_hold', 'rejected', 'banned'].includes(senderProfile?.reward_status)) {
    toast.error('Tai khoan dang bi han che. Khong the tang qua. Vui long lien he Admin.');
    return null;
  }
}
```

### File 4: `src/components/donations/UnifiedGiftSendDialog.tsx`
Them kiem tra khi mo dialog de hien canh bao som:

```typescript
// Fetch trang thai user khi dialog mo
const [isRestricted, setIsRestricted] = useState(false);

useEffect(() => {
  if (isOpen) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles')
          .select('reward_status, is_banned')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setIsRestricted(
              data?.is_banned ||
              ['on_hold', 'rejected', 'banned'].includes(data?.reward_status)
            );
          });
      }
    });
  }
}, [isOpen]);
```

Va vo hieu hoa nut gui khi `isRestricted === true`, hien thi thong bao canh bao.

## Tong ket
- **4 file** can sua
- **Khong can thay doi database** - su dung du lieu co san (`profiles.reward_status`, `profiles.is_banned`)
- Chan o **ca backend lan frontend** de dam bao an toan nhieu lop
- User bi han che se thay thong bao ro rang huong dan lien he Admin

