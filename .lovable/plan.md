

## Fix: Nut "Cho duyet" hien sai khi chua claim

### Van de hien tai

Truong `reward_status` trong database mac dinh la `'pending'` cho TAT CA nguoi dung (415/416 user). Component `ClaimRewardsSection` coi `pending` la "bi khoa" nen hien nut "Cho duyet" (disabled) thay vi cho phep claim.

Thuc te, quy trinh claim khong can admin duyet truoc - nguoi dung co the claim bat cu luc nao khi du dieu kien (>= 200,000 CAMLY, chua het han muc ngay).

### Giai phap

Thay doi logic hien thi nut Claim: chi vo hieu hoa khi `reward_status` la `on_hold` hoac `rejected` (admin chu dong khoa). Cac trang thai khac (`pending`, `approved`, null) deu cho phep claim binh thuong.

### Chi tiet ky thuat

**File: `src/components/wallet/ClaimRewardsSection.tsx`**

1. Sua `statusConfig` de `pending` khong con disabled:
   - `pending` -> `disabled: false` (mac dinh cho phep claim)
   - `approved` -> `disabled: false` (da duyet, cho phep)
   - `on_hold` -> `disabled: true` (admin tam giu)
   - `rejected` -> `disabled: true` (admin tu choi)

2. Sua logic hien thi nut:
   - Khi `pending` hoac `approved`: hien "Claim X CAMLY" (nut vang, cho phep nhan)
   - Khi `on_hold`: hien "Tam giu" (nut xam, disabled)
   - Khi `rejected`: hien "Tu choi" (nut xam, disabled)
   - Khi chua ket noi vi: hien "Ket noi vi de Claim" (nut xanh)

3. Bo dieu kien `claimableReward < MINIMUM_THRESHOLD` ra khoi disabled cua nut - thay vao do chi hien canh bao duoi thanh tien trinh (da co san).

Khong thay doi database hay backend. Chi sua logic UI trong 1 file duy nhat.

