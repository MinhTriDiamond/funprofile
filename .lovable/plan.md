
# Hien thi "Ten hien thi" va Kiem tra dia chi vi trong muc Tang qua

## Van de 1: Hien thi "Ten hien thi" (display_name) thay vi @username

Hien tai, moi noi co avatar trong dialog Tang qua deu chi hien thi `@username`. Theo chuan cua he thong, can hien thi `display_name` (ten hien thi) o dong chinh, `@username` o dong phu.

### Cac vi tri can sua trong `UnifiedGiftSendDialog.tsx`:

1. **Nguoi gui (Sender)** - dong 648-670: Hien `display_name` thay vi `@username` lam ten chinh
2. **Nguoi nhan preset** - dong 740-763: Them `display_name` 
3. **Chip da chon** - dong 773-803: Hien `display_name` trong chip
4. **Ket qua tim kiem** - dong 824-843: Hien `display_name` va `@username` phu
5. **Xac nhan - Nguoi gui** - dong 932-947: Hien `display_name`
6. **Xac nhan - Nguoi nhan multi** - dong 967-1002: Hien `display_name`
7. **Xac nhan - Nguoi nhan single** - dong 1003-1018: Hien `display_name`

### Thay doi ky thuat:

**ResolvedRecipient interface** - them truong `displayName`:
```typescript
interface ResolvedRecipient {
  id: string;
  username: string;
  displayName: string | null;  // NEW
  avatarUrl: string | null;
  walletAddress: string | null;
  hasVerifiedWallet?: boolean;
}
```

**Sender profile** - them `display_name` vao select:
```typescript
// Dong 137: Them display_name
.select('username, display_name, avatar_url, wallet_address')
```

**Search query** - them `display_name` vao selectFields:
```typescript
const selectFields = 'id, username, display_name, avatar_url, wallet_address, public_wallet_address, external_wallet_address';
```

**Hien thi**: Moi noi co avatar se hien:
- Dong chinh: `display_name || username` (ten hien thi)
- Dong phu: `@username` (nho hon, mau xam)

---

## Van de 2: Dia chi vi hien thi khong khop voi trang ca nhan

### Nguyen nhan:
Dialog hien thi `address` tu wagmi (vi hien tai dang ket noi trong trinh duyet), KHONG phai dia chi vi luu trong profile. Day la **dung thiet ke** vi giao dich blockchain can ky tu vi dang ket noi.

Tuy nhien, neu nguoi dung ket noi mot tai khoan vi khac voi tai khoan da luu trong profile, se xuat hien khong khop. Can **canh bao nguoi dung** khi dia chi vi dang ket noi khac voi dia chi da luu trong profile.

### Giai phap:
Them canh bao khi `address` (wagmi) khac voi `senderProfile.wallet_address` / `public_wallet_address`:

```typescript
// So sanh dia chi vi dang ket noi voi dia chi luu trong profile
const walletMismatch = address && senderProfile && 
  address.toLowerCase() !== senderProfile.wallet_address?.toLowerCase() &&
  address.toLowerCase() !== senderProfile.public_wallet_address?.toLowerCase();
```

Hien thi canh bao mau cam phia duoi phan Nguoi gui neu co khong khop.

---

## Tong ket cac file can sua:

### File 1: `src/components/donations/UnifiedGiftSendDialog.tsx`
- Them `display_name` vao interface, query, va select
- Cap nhat tat ca 7 vi tri hien thi avatar de dung `display_name`
- Them `public_wallet_address` vao sender profile query
- Them canh bao khi dia chi vi khong khop
- Truyen `displayName` vao `presetRecipient` mapping

### File 2: `src/components/feed/FacebookPostCard.tsx`
- Truyen them `displayName` vao presetRecipient cua DonationButton (neu co)

### File 3: `src/pages/Profile.tsx`
- Truyen them `displayName` vao presetRecipient cua DonationButton (neu co)
