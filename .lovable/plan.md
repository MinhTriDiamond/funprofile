

# Sua loi Gift History khong ghi nhan giao dich

## Van de da xac dinh

Edge function `record-donation` dang **chan** viec ghi nhan gift history khi `reward_status = 'on_hold'`. Tat ca 6 giao dich gan day deu tra ve HTTP 403.

Logic hien tai (dong 82-86 trong `record-donation/index.ts`):
```text
if reward_status in ['on_hold', 'rejected', 'banned'] -> 403 Forbidden
```

Tuy nhien, `on_hold` chi nen anh huong den viec **rut thuong (claim reward)**, khong nen chan viec **tang qua (donate)**. Viec tang qua la giao dich blockchain da thanh cong, can phai duoc ghi nhan de dam bao tinh minh bach.

## De xuat giai phap

### Thay doi 1: Cap nhat `record-donation/index.ts`

Chi chan `is_banned = true`, bo dieu kien `on_hold` va `rejected` ra khoi logic chan ghi nhan donation:

- **Truoc:** Chan `on_hold`, `rejected`, `banned`
- **Sau:** Chi chan `is_banned = true`

Ly do: Trang thai `on_hold`/`rejected` chi nen anh huong den tinh nang claim reward, khong anh huong den giao dich P2P da thuc hien tren blockchain.

### Thay doi 2: Phuc hoi 6 giao dich bi mat

Tao mot script SQL de ghi nhan lai 6 giao dich da bi mat vao bang `donations` dua tren du lieu tu bang `transactions`. Hoac chay lai `record-donation` sau khi sua code.

**Cach 1 (de xuat):** Sau khi deploy code moi, con co the gui lai qua cho cung nguoi nhan -- nhung cach nay khong hieu qua vi phai gui them token.

**Cach 2 (tot hon):** Admin insert truc tiep vao bang `donations` tu du lieu `transactions`:

Can doc them thong tin tu `transactions` (to_address) de map voi `profiles` (wallet address -> user id) roi insert vao `donations`.

## Chi tiet ky thuat

### File can sua:
- `supabase/functions/record-donation/index.ts` -- xoa block `on_hold`/`rejected`, chi giu `is_banned`

### Database:
- Insert 6 ban ghi donation bi mat (tu transactions co tx_hash tuong ung)

