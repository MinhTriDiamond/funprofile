
# Plan: Gui Token Khong Can Ban Be + Username Duy Nhat

## Tong Quan

4 thay doi chinh:
1. **DB Migration**: Tao `username_normalized`, unique index, trigger, fix duplicates
2. **GiftNavButton**: Bo friend-only, mo thang UnifiedGiftSendDialog (khong preset recipient)
3. **UnifiedGiftSendDialog**: Search theo `username_normalized`, uu tien `public_wallet_address`, BAT BUOC co username moi gui duoc (khong cho gui den dia chi vi ngoai he thong)
4. **EditProfile**: Validate username (a-z, 0-9, _, .; 3-20 ky tu) + check trung lap realtime

## Chi Tiet

### 1. DB Migration

- Them cot `username_normalized` (text, generated always as `lower(trim(username))`)
- Fix 4 cap username trung lap hien tai (append suffix cho ban ghi cu hon)
- Tao UNIQUE INDEX tren `username_normalized`
- Tao trigger tu dong cap nhat `username_normalized` khi insert/update

### 2. GiftNavButton -- Don gian hoa

Hien tai: Bam nut -> mo dialog chon ban be -> chon xong -> mo UnifiedGiftSendDialog voi preset recipient.

**Sau khi fix**: Bam nut -> mo thang UnifiedGiftSendDialog (mode="navbar", KHONG preset recipient). User search nguoi nhan ngay trong dialog gift.

- Xoa toan bo logic fetch friends, dialog chon ban be
- Chi giu nut bam va mo UnifiedGiftSendDialog truc tiep
- Code ngan hon ~70%

### 3. UnifiedGiftSendDialog -- Nang cap search va wallet

**3a. Search theo `username_normalized`**
- Thay `ilike('username', ...)` bang query them `public_wallet_address, custodial_wallet_address`
- Khi search theo address: tim trong ca 3 cot (`wallet_address`, `public_wallet_address`, `custodial_wallet_address`)

**3b. Uu tien `public_wallet_address`**
- Khi chon recipient, resolve wallet address theo thu tu:
  1. `public_wallet_address`
  2. `custodial_wallet_address`
  3. `wallet_address`
- Hien badge "Da xac thuc vi" (Shield icon) neu co `public_wallet_address`

**3c. KHONG cho gui den dia chi vi ngoai he thong**
- Khi search theo address ma khong tim thay user: bao loi "Khong tim thay FUN username" va KHONG cho gui
- BAT BUOC phai co @username + dia chi vi de gui duoc

### 4. EditProfile -- Validation Username

- Username chi cho phep: `a-z`, `0-9`, `_`, `.`
- Do dai: 3-20 ky tu
- Auto trim
- Khi submit: kiem tra trung lap qua `username_normalized` truoc khi update
- Bao loi ro: "Username da duoc su dung"

## Danh sach file thay doi

| File | Hanh dong | Mo ta |
|------|-----------|-------|
| DB Migration | Tao moi | `username_normalized`, unique index, trigger, fix duplicates |
| `src/components/donations/GiftNavButton.tsx` | Rewrite | Bo friend dialog, mo thang UnifiedGiftSendDialog |
| `src/components/donations/UnifiedGiftSendDialog.tsx` | Sua | Uu tien public_wallet_address, search normalized, badge xac thuc |
| `src/components/profile/EditProfile.tsx` | Sua | Validation username strict + uniqueness check |

## Acceptance Criteria
1. User A khong phai ban voi User B van gui duoc qua bang @username
2. Username duy nhat (case-insensitive) -- DB enforced
3. KHONG cho gui den dia chi vi khong co user trong he thong
4. Recipient hien avatar + username + dia chi vi + badge xac thuc vi
