
# Cai thien trai nghiem dang nhap vi

## Van de 1: Loi "Edge Function returned a non-2xx status code"

Khi vi chua duoc dang ky, edge function `sso-web3-auth` tra ve status 403 voi thong bao cu the. Nhung `supabase.functions.invoke` tu dong nem loi chung "Edge Function returned a non-2xx status code" thay vi doc noi dung response body. Ket qua la nguoi dung thay toast loi chung chung thay vi thong bao huong dan cu the.

**Giai phap**: Thay doi cach goi edge function -- khong dung `supabase.functions.invoke` ma goi truc tiep bang `fetch` de kiem soat response status va doc body JSON cho moi truong hop. Hoac doc `error.context` tu FunctionsHttpError de lay response body.

## Van de 2: Nut "Ky Xac Nhan" nen doi thanh "Dang Nhap"

Khi vi da ket noi, nut hien tai hien "Ky Xac Nhan" khien nguoi dung hoang mang. Nen doi thanh "Dang Nhap bang Vi" de ro rang hon. Buoc ky van dien ra phia sau nhung UI thi hien thi than thien hon.

## Chi tiet ky thuat

### File 1: `src/components/auth/WalletLoginContent.tsx`

**Thay doi A -- Xu ly loi edge function dung cach:**

Thay doi phan goi `supabase.functions.invoke` (dong 68-79) de xu ly response khong phai 2xx:

```typescript
// Goi edge function va xu ly response thu cong
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-web3-auth`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      wallet_address: address,
      signature,
      message,
      nonce,
    }),
  }
);
const data = await response.json();
if (!response.ok) {
  throw new Error(data?.error || data?.message || 'Authentication failed');
}
```

Nhu vay khi vi chua dang ky, error.message se la "WALLET_NOT_REGISTERED" va catch block hien tai da xu ly truong hop nay voi toast huong dan cu the.

**Thay doi B -- Doi nhan nut tu "Ky Xac Nhan" thanh "Dang Nhap":**

Dong 175 va 161:
- Doi text nut tu `t('walletSign')` thanh `t('walletLogin')` (hoac text truc tiep "Dang Nhap")
- Doi text trang thai tu `t('walletSigning')` thanh "Dang dang nhap..."
- Doi text "Vi Da Ket Noi" thanh cau than thien hon

### File 2: `src/i18n/translations.ts`

Them hoac cap nhat cac key dich:
- `walletLoginBtn`: "Login with Wallet" / "Dang Nhap bang Vi" / tuong ung cac ngon ngu khac
- `walletLoggingIn`: "Logging in..." / "Dang dang nhap..."

## Ket qua mong doi

1. Khi vi chua dang ky: hien toast huong dan cu the "Vi chua duoc ket noi! Neu da co tai khoan..." thay vi loi chung "Edge Function returned a non-2xx status code"
2. Khi vi da ket noi: nut hien "Dang Nhap bang Vi" thay vi "Ky Xac Nhan", trai nghiem than thien hon
