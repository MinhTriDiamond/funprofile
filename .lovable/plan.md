
# Fix: Tai khoan bi dang xuat sau khi dang nhap

## Nguyen nhan goc

Nhieu trang (Wallet, Friends, va cac trang khac) dang lang nghe su kien `onAuthStateChange` va **tu dong chuyen huong ve `/auth` bat cu khi nao `session` la null**, ma khong kiem tra loai su kien (`event`).

Khi Supabase tu dong lam moi token (refresh token), co the xay ra tinh trang:
1. Token cu het han
2. Supabase gui su kien `TOKEN_REFRESHED` nhung trong qua trinh refresh, session co the tam thoi la `null`
3. Cac listener bat duoc `session === null` va lap tuc chuyen ve `/auth`
4. Nguoi dung bi "out" du khong chu dong dang xuat

Van de nay dac biet hay xay ra khi nguoi dung chuyen tab roi quay lai, hoac khi mang khong on dinh.

## Giai phap

Chi chuyen huong ve `/auth` khi su kien la `SIGNED_OUT` (nguoi dung chu dong dang xuat). Cac su kien khac voi session null (nhu refresh that bai) se khong gay chuyen huong.

## Cac file can sua

### 1. `src/pages/Wallet.tsx` (dong 37-41)
Hien tai:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (!session) {
    navigate('/auth');
  }
});
```
Doi thanh:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    navigate('/auth');
  }
});
```

### 2. `src/pages/Friends.tsx` (dong 42-49)
Hien tai:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    setCurrentUserId(session.user.id);
    setLoading(false);
  } else {
    navigate('/auth');
  }
});
```
Doi thanh:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    setCurrentUserId(session.user.id);
    setLoading(false);
  } else if (event === 'SIGNED_OUT') {
    navigate('/auth');
  }
});
```

### 3. `src/pages/Feed.tsx` (dong 92-94)
Cap nhat tuong tu - chi set userId ve rong khi `SIGNED_OUT`:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    setCurrentUserId(session?.user?.id || '');
  } else if (event === 'SIGNED_OUT') {
    setCurrentUserId('');
  }
});
```

## Ket qua
- Nguoi dung se KHONG bi dang xuat khi token tu dong refresh
- Chi bi chuyen ve trang dang nhap khi chu dong bam "Dang xuat"
- AuthSessionKeeper trong App.tsx van hoat dong binh thuong de lam moi session khi quay lai tab
