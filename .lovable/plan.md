

# Nang Cap Trang Lich Su Giao Dich theo FUN Play

## Tong quan
Bo sung cac tinh nang tu trang `/transactions` cua FUN Play vao trang `/donations` hien tai, va them lien ket "Lich Su Giao Dich" vao thanh dieu huong ben trai (sidebar).

---

## 1. Them "Lich Su Giao Dich" vao Sidebar

### File: `src/components/feed/FacebookLeftSidebar.tsx`
- Them mot muc moi vao mang `shortcutItems` (line 86-92), dat ngay sau "Manh Thuong Quan"
- Icon: `Globe` (tu lucide-react, da import san)
- Label: "Lich Su Giao Dich"
- Path: `/donations`
- Color: `text-emerald-500`

---

## 2. Nang cap Stats Cards (5 the thay vi 4)

### File: `src/components/donations/SystemDonationHistory.tsx`
Thay doi stats cards tu 4 thanh 5 the theo mau FUN Play:

| The hien tai | The moi (theo FUN Play) |
|---|---|
| Tong giao dich | Tong giao dich (giu nguyen) |
| Tong CAMLY | **Tong gia tri** (gop tat ca token thanh 1 so) |
| Tong BNB | **Hom nay** (so giao dich trong ngay) |
| Light Score | **Thanh cong** (so giao dich confirmed) |
| _(khong co)_ | **Cho xu ly** (so giao dich pending) |

### File: `src/hooks/useAdminDonationHistory.ts`
- Them `todayCount` vao stats query (dem giao dich trong ngay hom nay)
- Them `pendingCount` vao stats query
- Them `totalValue` (tong so luong tat ca token)

---

## 3. Bo sung Header giong FUN Play

### File: `src/components/donations/SystemDonationHistory.tsx`
- Them subtitle: "Minh bach - Truy vet Blockchain - Chuan Web3"
- Doi icon header thanh Globe (thay vi Gift)
- Doi tieu de thanh "Lich Su Giao Dich"

---

## 4. Nang cap bo loc (Filters)

### File: `src/components/donations/SystemDonationHistory.tsx`
Them cac bo loc moi:
- **"Tat ca loai"** dropdown: Tat ca / Tang thuong / Chuyen tien
- **"Chi onchain"** toggle switch: loc chi hien giao dich co tx_hash (on-chain)
- Mo rong search placeholder: "Tim theo ten, dia chi vi, ma giao dich (tx hash)..."

### File: `src/hooks/useAdminDonationHistory.ts`
- Them filter `onlyOnchain: boolean` va `type: string` vao `AdminDonationFilters`
- Ap dung filter `onlyOnchain`: chi lay record co `tx_hash IS NOT NULL`
- Mo rong search de tim theo tx_hash

---

## 5. Nang cap giao dien danh sach giao dich

### File: `src/components/donations/SystemDonationHistory.tsx`

**Desktop (Table):**
- Hien thi wallet address rut gon (0x1234...abcd) ben canh username
- Them nut copy address va link BscScan cho moi dia chi vi
- Them badges "Tang thuong" (vang) va "Onchain" (xanh la) cho moi giao dich
- Hien thi message (loi nhan) inline trong moi dong
- Them cot TX Hash voi link BscScan
- Them nut "Xem Card" (thay vi click ca dong) de mo celebration card

**Mobile (List):**
- Tuong tu desktop nhung layout doc
- Hien thi wallet address rut gon
- Nut "Xem Card" o goc phai duoi

---

## 6. Cap nhat tieu de trang

### File: `src/pages/Donations.tsx`
- Khong can thay doi nhieu, chi la wrapper

---

## Tong hop file can sua

| File | Thay doi |
|------|----------|
| `src/components/feed/FacebookLeftSidebar.tsx` | Them muc "Lich Su Giao Dich" vao shortcutItems |
| `src/components/donations/SystemDonationHistory.tsx` | Nang cap header, stats (5 the), filters (loai, onchain toggle), danh sach (wallet addr, badges, TX hash, Xem Card) |
| `src/hooks/useAdminDonationHistory.ts` | Them todayCount, pendingCount, totalValue vao stats; them onlyOnchain va type filter; mo rong search cho tx_hash |

