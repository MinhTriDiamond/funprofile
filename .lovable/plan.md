
# Hoan Thien Giao Dien Lich Su Giao Dich

## Trang thai hien tai

### Da hoan thanh:
- DonationReceivedCard: nhac Rich3.mp3 loop, mau xanh la tuoi, tieu de vang, confetti + RICH 9 sac + phao hoa

### Chua hoan thanh:
- Lich su giao dich (SystemDonationHistory) con thieu:
  1. Dia chi vi duoi avatar (ca nguoi gui va nguoi nhan)
  2. Loi nhan chuc mung hien thi tren desktop
  3. Mau nen xanh la (hien tai van trang/xam)

---

## Cac thay doi can thuc hien

### 1. Bo sung wallet address vao query

**File: `src/hooks/useDonationHistory.ts`**
- Them `public_wallet_address` va `custodial_wallet_address` vao DonationRecord interface

**File: `src/hooks/useAdminDonationHistory.ts`**
- Them `public_wallet_address`, `custodial_wallet_address` vao select query cho ca sender va recipient

### 2. Cap nhat giao dien SystemDonationHistory

**File: `src/components/donations/SystemDonationHistory.tsx`**

#### 2a. Doi mau nen sang xanh la
- Container chinh: them class `bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 min-h-screen p-4 rounded-xl`
- Stats cards: `bg-white/90 backdrop-blur`
- Filter card: `bg-white/90 backdrop-blur`
- Table card: `bg-white/95`
- Text header: `text-white`
- Pagination text: `text-white`

#### 2b. Hien thi dia chi vi duoi avatar (Desktop)
- Duoi ten nguoi gui: hien thi dia chi vi rut gon (0xABC...1234)
- Kem nut Copy va link BscScan
- Tuong tu cho nguoi nhan
- Su dung helper: `public_wallet_address || custodial_wallet_address`

#### 2c. Hien thi loi nhan tren desktop
- Them cot "Loi nhan" hoac hien thi inline trong dong giao dich (in nghieng, trong dau ngoac kep)

#### 2d. Cap nhat Mobile layout tuong tu
- Hien thi dia chi vi rut gon duoi username
- Nut Copy + BscScan link

---

## Tong hop file can sua

| File | Thay doi |
|------|----------|
| `src/hooks/useDonationHistory.ts` | Them wallet address vao DonationRecord interface |
| `src/hooks/useAdminDonationHistory.ts` | Them wallet address vao select query |
| `src/components/donations/SystemDonationHistory.tsx` | Doi mau nen xanh la, them wallet address + loi nhan hien thi |
