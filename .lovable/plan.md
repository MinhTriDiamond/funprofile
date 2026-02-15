

## Mo khoa tai khoan bi tam giu do bai trung cross-user

### Van de
Sau khi xoa logic kiem tra bai trung cross-user trong Edge Function, van con 7 user dang bi trang thai `on_hold` voi ly do cu "Bai viet trong ngay trung noi dung voi tai khoan khac". Nhung user nay khong the claim duoc vi trang thai van bi khoa trong database.

### Danh sach user bi anh huong (7 nguoi)

| Ho ten | ID |
|--------|-----|
| Bich Lien | 30f454c9-... |
| Nguyen Dinh Duyen | 08553a3a-... |
| TRAN VAN LUC | dc9a9ea6-... |
| (4 user chua co ten) | ... |

### Giai phap

Chay 1 lenh SQL UPDATE de chuyen tat ca 7 user tu `on_hold` ve `pending` va xoa admin_notes:

```sql
UPDATE profiles
SET reward_status = 'pending',
    admin_notes = NULL
WHERE reward_status = 'on_hold'
  AND admin_notes = 'Bài viết trong ngày trùng nội dung với tài khoản khác';
```

### Ket qua
- 7 user se duoc mo khoa va co the claim CAMLY binh thuong
- Khong anh huong den cac user bi on_hold vi ly do khac (device_hash, vi trung, ten ao...)
- Khong can thay doi code frontend

