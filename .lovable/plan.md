

# Nang Cap Giao Dien Lich Su Giao Dich

## Tong quan
Chuyen giao dien danh sach giao dich sang dang "card" giong FUN Play (hinh 1), hien thi dia chi vi duoi avatar, loi nhan chuc mung, va doi mau nen sang xanh la (hinh 3).

---

## 1. Bo sung wallet address vao query

### File: `src/hooks/useAdminDonationHistory.ts`
- Them `public_wallet_address` va `custodial_wallet_address` vao select cua profiles join:
  ```
  sender:profiles!donations_sender_id_fkey(id, username, avatar_url, public_wallet_address, custodial_wallet_address)
  recipient:profiles!donations_recipient_id_fkey(id, username, avatar_url, public_wallet_address, custodial_wallet_address)
  ```
- Tuong tu cho ham `fetchAllDonationsForExport`

### File: `src/hooks/useDonationHistory.ts`
- Cap nhat `DonationRecord` interface, them wallet address vao sender va recipient:
  ```
  sender: { id: string; username: string; avatar_url: string | null; public_wallet_address?: string | null; custodial_wallet_address?: string | null };
  recipient: { id: string; username: string; avatar_url: string | null; public_wallet_address?: string | null; custodial_wallet_address?: string | null };
  ```

---

## 2. Doi giao dien desktop tu Table sang Card layout (giong hinh 1)

### File: `src/components/donations/SystemDonationHistory.tsx`

Thay the Table hien tai bang layout dang card cho moi giao dich, moi card gom:

**Header (dong 1):**
- Trai: Avatar nguoi gui + Ten + dia chi vi rut gon (0xABC...1234) + nut Copy + nut BscScan link
- Giua: Mui ten (->)
- Phai: Ten nguoi nhan + Avatar + dia chi vi rut gon + nut Copy + nut BscScan link

**Dong 2:**
- Trai: Badges "Tang thuong" (do/cam) + "Onchain" (xanh la) 
- Phai: So tien + Token symbol (vd: 9.999 CAMLY) - mau do/cam noi bat

**Dong 3 (Loi nhan):**
- Hien thi day du loi nhan chuc mung trong dau ngoac kep, font in nghieng

**Footer (dong 4):**
- Trai: Icon tich xanh + "Thanh cong" + thoi gian + "BSC"
- Giua: TX hash rut gon + nut Copy + nut BscScan
- Phai: Nut "Xem Card" (mau do/cam)

---

## 3. Doi mau nen sang xanh la (green theme)

### File: `src/components/donations/SystemDonationHistory.tsx`
- Doi background cua toan bo trang tu trang/xam sang gradient xanh la dam (tuong tu hinh 3):
  - Container chinh: `bg-gradient-to-br from-green-600 to-green-700` hoac `bg-[#5a8f5a]`
  - Cac card giao dich: `bg-white/95` de noi bat tren nen xanh
  - Stats cards: `bg-white/90 backdrop-blur`
  - Filter card: `bg-white/90 backdrop-blur`
  - Text header: `text-white`
  - Pagination: background trong suot voi text trang

---

## 4. Cap nhat Mobile layout tuong tu

### File: `src/components/donations/SystemDonationHistory.tsx`
- Mobile list cung chuyen sang card layout nho gon hon
- Hien thi dia chi vi rut gon duoi username
- Hien thi loi nhan day du
- Nut Copy + BscScan link cho dia chi vi

---

## 5. Helper lay dia chi vi

Them helper function trong component:
```text
const getWalletAddress = (user) => 
  user?.public_wallet_address || user?.custodial_wallet_address || null;
```

---

## Tong hop file can sua

| File | Thay doi |
|------|----------|
| `src/hooks/useDonationHistory.ts` | Them wallet address vao DonationRecord interface |
| `src/hooks/useAdminDonationHistory.ts` | Them public_wallet_address, custodial_wallet_address vao select query |
| `src/components/donations/SystemDonationHistory.tsx` | Doi layout thanh card, them wallet address + loi nhan, doi mau nen xanh la |

