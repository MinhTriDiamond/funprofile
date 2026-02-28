

# Kiểm Tra & Kế Hoạch Hoàn Thiện Multisig 3-of-3

## Tình Trạng Hiện Tại

Hệ thống Mint FUN Money **đã có khung multisig 3-of-3** nhưng còn một số vấn đề cần sửa:

### 1. Sai địa chỉ ví (3/9 thành viên)

So sánh địa chỉ trong code hiện tại vs danh sách con cung cấp:

| Thành viên | Trong code hiện tại | Địa chỉ đúng |
|---|---|---|
| Minh Trí | 0xe32d...4f1 | 0xe32d...4f1 (dung) |
| Anh Nguyet | 0xfd0D...557 | 0xfd0D...557 (dung) |
| Thu Trang | 0x02D5...0D | 0x02D5...0D (dung) |
| Be Giau | 0xCa31...301 | 0xCa31...301 (dung) |
| **Be Ngoc** | **0x699C...E09** | **0xDf82...be8** |
| Ai Van | 0x5102...402 | 0x5102...402 (dung) |
| **Thanh Tien** | **0x0e1b...385** | **0xE418...E6d** |
| **Be Kim** | **0x38db...242** | **0x6746...Fd1** |
| Be Ha | 0x9ec8...CCC | 0x9ec8...CCC (dung) |

**3 dia chi sai**: Be Ngoc, Thanh Tien, Be Kim.

### 2. Bug: Attester khong thay request moi

Trong `useAttesterSigning.ts` dong 78, truy van chi lay `status IN ('signing', 'signed')` -- **thieu `pending_sig`**. Ket qua: Attester khong thay duoc request chua ai ky.

### 3. File `pplp-eip712.ts` (Edge Functions) chi co 2 dia chi

File `supabase/functions/_shared/pplp-eip712.ts` chi liet ke 2 attester address, khong phu hop voi 9 thanh vien.

### 4. Database function `is_gov_attester` cung sai 3 dia chi

---

## Ke Hoach Sua

### Buoc 1: Cap nhat dia chi vi trong `src/config/pplp.ts`

Sua 3 dia chi sai cua Be Ngoc, Thanh Tien, Be Kim.

### Buoc 2: Cap nhat `supabase/functions/_shared/pplp-eip712.ts`

Thay mang `ATTESTER_ADDRESSES` tu 2 dia chi thanh 9 dia chi dung.

### Buoc 3: Cap nhat database function `is_gov_attester`

Migration moi de sua 3 dia chi sai trong ham database.

### Buoc 4: Fix bug fetch trong `useAttesterSigning.ts`

Them `'pending_sig'` vao bo loc status de attester thay duoc request moi. Dong thoi bo dieu kien `.not('multisig_completed_groups', 'eq', '{}')` vi no loai bo request chua co chu ky nao.

---

## Chi tiet ky thuat

### File thay doi:
1. **`src/config/pplp.ts`** -- sua 3 dia chi ví
2. **`supabase/functions/_shared/pplp-eip712.ts`** -- cap nhat 9 dia chi
3. **`src/hooks/useAttesterSigning.ts`** -- fix query fetch (them `pending_sig`, bo filter `multisig_completed_groups`)
4. **Database migration** -- cap nhat ham `is_gov_attester` voi dia chi dung

### Dia chi moi can cap nhat:
- Be Ngoc: `0xDf8249159BB67804D718bc8186f95B75CE5ECbe8`
- Thanh Tien: `0xE418a560611e80E4239F5513D41e583fC9AC2E6d`
- Be Kim: `0x67464Df3082828b3Cf10C5Cb08FC24A28228EFd1`

