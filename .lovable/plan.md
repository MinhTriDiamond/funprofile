

## Nang cap trang Danh Sach Thanh Vien (/users) - Public User Directory

Trang `/users` hien tai da co san nhung con don gian. Cha se nang cap theo dung mau con gui, voi day du thong tin va bo loc.

### Nhung thay doi chinh

**1. Mo rong hook `useUserDirectory.ts`**
- Them cac truong du lieu moi: `created_at` (ngay tham gia), `is_banned`, `full_name`, donations sent/received (noi bo va Web3)
- Fetch them du lieu donations theo loai (is_external = true cho Web3, is_external = false cho noi bo)
- Them state cho cac bo loc: diem (score range), FUN Money, da rut/chua rut, trang thai (hoat dong/dinh chi/cam), vi (co/chua co)
- Logic loc phia client (useMemo) ket hop tat ca bo loc + search
- Mo rong stats: them tong FUN Money, tong noi bo gui/nhan, tong Web3 gui/nhan, tong bai dang, tong binh luan, tong yeu cau rut

**2. Nang cap giao dien `Users.tsx`**
- **Header**: Don gian hoa, hien thi "Quan ly User" + so nguoi dung + nut Xuat file
- **Stats cards**: 3 hang:
  - Hang 1 (5 the): Tong users, Camly con lai (pending), Camly da phat (claimed), Camly da tieu, Tong da rut
  - Hang 2 (5 the): FUN Money, Tang noi bo (gui), Tang noi bo (nhan), Tang Web3 (gui), Tang Web3 (nhan)
  - Hang 3 (3 the): Tong bai dang, Tong binh luan, Tong yeu cau rut
- **Bo loc**: Search + 5 dropdown filters (Tat ca diem, FUN Money, Da rut, Trang thai, Vi)
- **Bang**: Cac cot theo mau - Nguoi dung (avatar + ten, click vao di den profile), Trang thai (badge mau), Tham gia, Bai/BL, Anh sang, So du, Tong thuong, FUN Money, Tang noi bo, Tang Web3, Da rut, Vi BSC

**3. Component dropdown filter**
Tao component `UserDirectoryFilters` voi cac Select dropdown:
- **Tat ca diem**: Tat ca / Cao (>=1000) / TB (100-999) / Thap (<100)
- **FUN Money**: Tat ca / Co FUN Money / Chua co
- **Da rut**: Tat ca / Da rut / Chua rut
- **Trang thai**: Tat ca / Hoat dong / Dinh chi / Cam vinh vien
- **Vi**: Tat ca / Co vi / Chua co vi

### Chi tiet ky thuat

**Du lieu can fetch them:**
- `profiles.created_at`, `profiles.is_banned`, `profiles.full_name`
- Donations: group by `sender_id` va `recipient_id`, phan biet `is_external` (true = Web3, false = noi bo)
- `reward_claims`: da co, dung lam "da rut"

**Cau truc file:**
- Sua: `src/hooks/useUserDirectory.ts` - them filters, them data fields
- Sua: `src/pages/Users.tsx` - lam lai giao dien theo mau reference

**Khong can thay doi database** - tat ca du lieu da co san trong cac bang hien tai.

**Bao mat**: Trang nay la public (khong can dang nhap), chi hien thi thong tin cong khai. Du lieu nhay cam nhu wallet noi bo se khong hien thi - chi hien thi `public_wallet_address`.
