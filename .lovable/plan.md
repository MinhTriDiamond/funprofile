

# Sua Loi Dia Chi Vi Giong Nhau Cho Cac Mint Request

## Tinh Trang Hien Tai

- **92 yeu cau mint** dang cho xu ly (pending_sig/signed)
- **90/92** tro ve cung 1 dia chi vi `0x44d1a5...243858` (vi cua hoangtydo8888)
- **2/92** da dung (utopiathuy va Angelkieuphi_2)
- **88 user bi anh huong** CHUA co `public_wallet_address` trong Profile

## Nguyen nhan goc
Code cu su dung custodial wallet lam fallback. Nhieu user co cung custodial address do loi he thong cu, nen tat ca mint request deu tro ve 1 vi.

## Edge function da duoc sua
File `pplp-mint-fun` hien tai **da chinh xac** - chi dung `public_wallet_address`, khong fallback. Cac request **moi** se khong bi loi nay nua.

## Ke hoach xu ly 88 request cu sai dia chi

### Buoc 1: Tu choi (reject) tat ca request co dia chi vi sai
- Chi reject nhung request co `recipient_address = '0x44d1a52927465d879D4cc4e76189d87Bf8243858'` VA `user_id != 'fc042e3b...'` (vi hoangtydo8888 thi dia chi do la dung)
- Dat `status = 'rejected'`, ghi ly do "Dia chi vi khong chinh xac - vui long cai dat vi trong Profile va claim lai"
- Cap nhat lai `light_actions` lien quan ve `mint_status = 'approved'` de user co the claim lai

### Buoc 2: Giu nguyen 2 request dung
- hoangtydo8888 (vi `0x44d1a5...` la dung cua ho): **giu nguyen**
- utopiathuy va Angelkieuphi_2: **giu nguyen** (da co dia chi dung)

### SQL Update (1 lenh)
```sql
-- 1. Reject cac request sai dia chi (tru hoangtydo8888)
UPDATE pplp_mint_requests 
SET status = 'rejected', 
    reject_reason = 'Dia chi vi khong chinh xac. Vui long cai dat vi trong Profile va claim lai.'
WHERE status IN ('pending_sig', 'signed')
  AND recipient_address = '0x44d1a52927465d879D4cc4e76189d87Bf8243858'
  AND user_id != 'fc042e3b-691a-4b6c-b1e9-efe97d3430db';

-- 2. Mo lai light_actions de user claim lai sau khi cai vi
UPDATE light_actions 
SET mint_status = 'approved', mint_request_id = NULL
WHERE mint_request_id IN (
  SELECT id FROM pplp_mint_requests 
  WHERE status = 'rejected' 
    AND reject_reason LIKE 'Dia chi vi khong chinh xac%'
);
```

### Tong ket
| Hang muc | So luong |
|----------|---------|
| Request bi reject | ~88 |
| Request giu nguyen | ~4 |
| File code thay doi | 0 (da sua truoc do) |
| SQL update | 2 lenh |

Sau khi reject, cac user can:
1. Vao trang ca nhan (Profile) cai dat dia chi vi cong khai
2. Vao trang Wallet, claim lai cac light actions

