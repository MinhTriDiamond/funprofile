
# Kiem tra toan bo he thong fun.rich - Bao cao loi

## Tong quan
Sau khi kiem tra toan bo code hien tai, phat hien **4 van de** can xu ly:

---

## Van de 1: BUG - sso-web3-auth khong select `public_wallet_address` nhung lai tham chieu no

**Muc do:** Nghiem trong (gay loi logic)

**Chi tiet:** Trong file `supabase/functions/sso-web3-auth/index.ts`, dong 132-134 query `profileByLegacy` chi select:
```
id, username, wallet_address, external_wallet_address, custodial_wallet_address
```

Nhung dong 146 lai kiem tra `profileByLegacy.public_wallet_address` - truong nay **khong co trong select**, nen luon la `undefined`. Ket qua: moi lan legacy migration deu ghi de `public_wallet_address`, vi dieu kien `if (!profileByLegacy.public_wallet_address)` luon `true`.

**Giai phap:** Them `public_wallet_address` vao select cua ca 2 query (dong 124 va 134):
- Dong 124: `'id, username, external_wallet_address, custodial_wallet_address, public_wallet_address'`
- Dong 134: `'id, username, wallet_address, external_wallet_address, custodial_wallet_address, public_wallet_address'`

---

## Van de 2: CoinGecko API bi chan (CORS / Rate Limit)

**Muc do:** Trung binh (co fallback)

**Chi tiet:** Tat ca request den `api.coingecko.com` deu that bai voi loi "Failed to fetch". Nguyen nhan: CoinGecko free API bi rate limit hoac bi chan CORS tu domain lovableproject.com. Dieu nay gay ra hang chuc log loi moi khi tai trang vi 2 hook goi dong thoi:
- `useTokenBalances` goi CoinGecko (trong WalletCenterContainer va UnifiedGiftSendDialog)
- `useCamlyPrice` goi CoinGecko rieng (trong WalletCenterContainer)

He thong da co fallback prices nen khong bi crash, nhung gay nhieu log loi va UX khong tot.

**Giai phap:** Chuyen CoinGecko API call qua edge function de tranh CORS va rate limit. Tao edge function `token-prices` lam proxy:
- Client goi edge function thay vi goi truc tiep CoinGecko
- Edge function cache ket qua 60 giay de giam tai
- Ca `useTokenBalances` va `useCamlyPrice` deu goi chung 1 endpoint

---

## Van de 3: AuthKeeper Token refresh timeout

**Muc do:** Thap (da co retry va khong gay crash)

**Chi tiet:** Khi nguoi dung quay lai tab sau >30 giay, AuthSessionKeeper co goi `refreshSession()` nhung bi timeout 20s. Hien tai da co retry 1 lan. Day la van de mang, khong phai loi code.

**Giai phap:** Khong can sua code. Chi la canh bao mang, khong anh huong chuc nang.

---

## Van de 4: Realtime connection interrupted

**Muc do:** Thap (tu phuc hoi)

**Chi tiet:** Loi `Connection interrupted while trying to subscribe` xay ra khi ket noi WebSocket bi mat (chuyen tab, mang yeu). Supabase Realtime tu phuc hoi ket noi.

**Giai phap:** Khong can sua code. Day la hanh vi binh thuong.

---

## Tong ket cac file can sua

### File 1: `supabase/functions/sso-web3-auth/index.ts` (BUG NGHIEM TRONG)
- Dong 124: Them `public_wallet_address` vao select cua profileByExternal
- Dong 134: Them `public_wallet_address` vao select cua profileByLegacy
- Day la nguyen nhan khien vi bi ghi de moi khi dang nhap bang legacy wallet

### File 2: `supabase/functions/token-prices/index.ts` (MOI)
- Tao edge function proxy cho CoinGecko API
- Cache ket qua 60 giay
- Tra ve gia cua BNB, BTC, USDT, CAMLY

### File 3: `src/hooks/useTokenBalances.ts`
- Doi tu goi truc tiep CoinGecko sang goi edge function `token-prices`
- Giam so luong request va tranh CORS

### File 4: `src/hooks/useCamlyPrice.ts`
- Doi tu goi truc tiep CoinGecko sang goi edge function `token-prices`
- Hoac xoa hook nay va dung chung data tu `useTokenBalances`

---

## Uu tien xu ly

1. **Van de 1** (BUG vi): Can sua ngay - day la nguyen nhan chinh khien `public_wallet_address` bi ghi de
2. **Van de 2** (CoinGecko): Nen sua - giam loi va cai thien trai nghiem
3. **Van de 3 & 4**: Khong can sua - hoat dong binh thuong
