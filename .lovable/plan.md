

# Cap Nhat Mau Sac va Them Xuat PDF

## Cac thay doi

### File: `src/components/donations/SystemDonationHistory.tsx`

#### 1. So tien token (Hinh 1)
- Doi mau so tien tu do/cam sang **xanh la cay tuoi sang** (`text-emerald-500 font-bold text-xl`)
- Ap dung cho ca desktop card va mobile

#### 2. Loi nhan chuc mung (Hinh 2)
- Doi mau loi nhan tu `text-gray-600 italic` sang **mau vang hoang kim** (`text-yellow-500 font-semibold italic text-base`)
- Lam to chu hon va in dam

#### 3. So lieu thong ke (Hinh 3)
- Doi mau tat ca so trong Stats Cards sang **xanh la dam** (`text-green-700`)
- Tong gia tri giu mau vang/amber nhu hien tai (da dung)
- Lam to hon va in dam hon

#### 4. Them nut Xuat PDF (Hinh 4)
- Them nut "Xuat PDF" ben canh nut "Xuat CSV"
- Su dung thu vien browser (`window.print()` hoac tao PDF tu HTML bang `html2canvas` + jsPDF approach)
- Vi du vien da co `html2canvas`, se dung no de tao PDF don gian

### File: `src/utils/exportDonations.ts`
- Them ham `exportDonationsToPDF()` su dung html2canvas de chup va xuat PDF

---

## Tong hop

| File | Thay doi |
|------|--------|
| `src/components/donations/SystemDonationHistory.tsx` | Doi mau so tien (xanh la), loi nhan (vang hoang kim), so thong ke (xanh dam), them nut Xuat PDF |
| `src/utils/exportDonations.ts` | Them ham exportDonationsToPDF |

